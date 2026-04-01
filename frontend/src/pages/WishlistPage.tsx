import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWishlist, removeFromWishlist, updateTargetPrice, importSteamWishlist } from '../api/games'
import { useAuthStore } from '../store/authStore'
import { Navigate, Link } from 'react-router-dom'
import { Heart, Trash2, Target, Filter, ArrowUpDown, ExternalLink, Tag, Download, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

type SortOption = 'price-low' | 'price-high' | 'date-new' | 'date-old' | 'name' | 'discount'

export function WishlistPage() {
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-new')
  const [filterOnSale, setFilterOnSale] = useState(false)
  const [filterTargetMet, setFilterTargetMet] = useState(false)
  const [showSteamImport, setShowSteamImport] = useState(false)
  const [steamInput, setSteamInput] = useState('')

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  })

  const handleRefresh = async () => {
    toast.loading('Prijzen verversen...', { id: 'wishlist-refresh' })
    await refetch()
    toast.success('Prijzen bijgewerkt!', { id: 'wishlist-refresh' })
  }

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeFromWishlist(id),
    onSuccess: () => {
      toast.success('Verwijderd van verlanglijst')
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) => updateTargetPrice(id, price),
    onSuccess: () => {
      toast.success('Doelprijs bijgewerkt!')
      setEditingId(null)
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })

  const steamImportMutation = useMutation({
    mutationFn: (input: string) => importSteamWishlist(input),
    onSuccess: (data) => {
      console.log('Steam import success:', data)

      // Show success message with longer duration if there are more games to import
      const duration = data.remaining > 0 ? 8000 : 5000
      toast.success(data.message, { duration })

      // Keep modal open if there are more games to import
      if (data.remaining > 0) {
        // Don't close modal or clear input - user can click import again
      } else {
        setShowSteamImport(false)
        setSteamInput('')
      }

      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || 'Import mislukt'
      console.error('Steam import error:', error)
      toast.error(errorMsg, { duration: 8000 })
    },
  })

  const processedItems = useMemo(() => {
    let filtered = [...items]

    // Apply filters
    if (filterOnSale) {
      filtered = filtered.filter((item) => {
        const prices = item.game.prices || []
        return prices.some((p) => p.is_on_sale && p.discount_percent > 0)
      })
    }

    if (filterTargetMet) {
      filtered = filtered.filter((item) => {
        const best = item.game.best_price
        const target = item.target_price
        return best != null && target != null && best <= target
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.game.best_price || 999) - (b.game.best_price || 999)
        case 'price-high':
          return (b.game.best_price || 0) - (a.game.best_price || 0)
        case 'date-new':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
        case 'date-old':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
        case 'name':
          return a.game.name.localeCompare(b.game.name)
        case 'discount': {
          const getMaxDiscount = (prices: any[]) =>
            Math.max(...prices.map((p) => p.discount_percent || 0), 0)
          return getMaxDiscount(b.game.prices || []) - getMaxDiscount(a.game.prices || [])
        }
        default:
          return 0
      }
    })

    return filtered
  }, [items, sortBy, filterOnSale, filterTargetMet])

  const targetMetCount = items.filter((item) => {
    const best = item.game.best_price
    const target = item.target_price
    return best != null && target != null && best <= target
  }).length

  const fmt = (v?: number | null) => (v != null ? `€${v.toFixed(2).replace('.', ',')}` : '—')

  const getMaxDiscount = (prices: any[]) =>
    Math.max(...prices.map((p) => p.discount_percent || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Heart size={32} className="text-pink-400" />
            Verlanglijst
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            {items.length} game{items.length !== 1 ? 's' : ''} bijgehouden
            {targetMetCount > 0 && (
              <span className="ml-2 text-green-400">• {targetMetCount} op doelprijs!</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
            title="Prijzen verversen"
          >
            <RefreshCw size={18} className={isRefetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Ververs</span>
          </button>
          <button
            onClick={() => setShowSteamImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b2838] hover:bg-[#2a3f5f] text-white rounded-lg transition-colors font-medium text-sm"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Steam Import</span>
          </button>
        </div>
      </div>

      {/* Target Met Banner */}
      {targetMetCount > 0 && (
        <div className="mb-6 p-4 bg-green-950/30 border border-green-900/50 rounded-xl">
          <p className="text-green-400 font-semibold flex items-center gap-2">
            🎉 {targetMetCount} game{targetMetCount !== 1 ? 's zijn' : ' is'} op of onder je doelprijs!
          </p>
        </div>
      )}

      {/* Controls */}
      {items.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[#111320] border border-[#1e2235] rounded-xl p-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ArrowUpDown size={18} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 sm:flex-initial bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date-new">Nieuwste eerst</option>
              <option value="date-old">Oudste eerst</option>
              <option value="price-low">Prijs: Laag → Hoog</option>
              <option value="price-high">Prijs: Hoog → Laag</option>
              <option value="name">Naam (A-Z)</option>
              <option value="discount">Hoogste korting</option>
            </select>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Filter size={18} className="text-gray-400" />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filterOnSale}
                onChange={(e) => setFilterOnSale(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>In de aanbieding</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filterTargetMet}
                onChange={(e) => setFilterTargetMet(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Doelprijs bereikt</span>
            </label>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 bg-[#111320] border border-[#1e2235] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <Heart size={64} className="mx-auto mb-4 text-gray-600 opacity-30" />
          <p className="text-gray-400 mb-4 text-lg">Je verlanglijst is leeg</p>
          <p className="text-gray-500 mb-6 text-sm">Begin met het toevoegen van games aan je verlanglijst!</p>
          <Link
            to="/search"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Games zoeken →
          </Link>
        </div>
      ) : processedItems.length === 0 ? (
        /* No Results After Filtering */
        <div className="text-center py-20">
          <Filter size={64} className="mx-auto mb-4 text-gray-600 opacity-30" />
          <p className="text-gray-400 mb-2 text-lg">Geen games gevonden</p>
          <p className="text-gray-500 text-sm">Probeer je filters aan te passen</p>
        </div>
      ) : (
        /* Game Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedItems.map((item) => {
            const targetMet =
              item.target_price != null &&
              item.game.best_price != null &&
              item.game.best_price <= item.target_price
            const maxDiscount = getMaxDiscount(item.game.prices || [])

            return (
              <div
                key={item.id}
                className={`bg-[#111320] border ${
                  targetMet ? 'border-green-500/50' : 'border-[#1e2235]'
                } rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors relative group`}
              >
                {/* Target Met Badge */}
                {targetMet && (
                  <div className="absolute top-2 left-2 z-10 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Target size={12} />
                    DOEL BEREIKT
                  </div>
                )}

                {/* Discount Badge */}
                {maxDiscount > 0 && (
                  <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Tag size={12} />
                    -{maxDiscount}%
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  className="absolute top-2 right-2 z-10 p-2 bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Verwijderen"
                  style={maxDiscount > 0 ? { top: '3.5rem' } : {}}
                >
                  <Trash2 size={16} />
                </button>

                {/* Game Image */}
                <Link to={`/game/${item.game.steam_appid}`} className="block">
                  <img
                    src={item.game.header_image || ''}
                    alt={item.game.name}
                    className="w-full h-48 object-cover"
                  />
                </Link>

                {/* Card Content */}
                <div className="p-4">
                  <Link
                    to={`/game/${item.game.steam_appid}`}
                    className="block text-white font-semibold mb-2 hover:text-purple-400 transition-colors line-clamp-2"
                  >
                    {item.game.name}
                  </Link>

                  {/* Price Info */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-400 mb-1">Beste prijs</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${targetMet ? 'text-green-400' : 'text-white'}`}>
                        {fmt(item.game.best_price)}
                      </span>
                      {item.game.best_store && (
                        <span className="text-xs text-gray-500">via {item.game.best_store}</span>
                      )}
                    </div>
                  </div>

                  {/* Target Price */}
                  <div className="mb-3 p-3 bg-[#0d0f1a] border border-[#1e2235] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      <Target size={12} className="text-yellow-400" />
                      Doelprijs
                    </p>
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-1 bg-[#111320] border border-[#2a2d3e] rounded-md px-2 py-1">
                          <span className="text-gray-400 text-sm">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="flex-1 bg-transparent text-white text-sm outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          onClick={() => updateMutation.mutate({ id: item.id, price: parseFloat(editPrice) })}
                          className="text-green-400 hover:text-green-300 text-xs font-medium"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-400 hover:text-gray-300 text-xs font-medium"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.id)
                          setEditPrice(item.target_price?.toString() ?? '')
                        }}
                        className="text-yellow-400 hover:text-yellow-300 font-semibold text-sm"
                      >
                        {item.target_price != null ? fmt(item.target_price) : 'Instellen'}
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Toegevoegd {new Date(item.added_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                    <Link
                      to={`/game/${item.game.steam_appid}`}
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      Details <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Steam Import Modal */}
      {showSteamImport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111320] border border-[#1e2235] rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Download size={24} className="text-blue-400" />
                Steam Wishlist Importeren
              </h2>
              <button
                onClick={() => setShowSteamImport(false)}
                className="p-2 hover:bg-[#1e2235] rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-4">
                Importeer je publieke Steam wishlist. Werkt met:
              </p>
              <ul className="text-gray-500 text-xs space-y-1 mb-4">
                <li>• Steam ID: <code className="text-purple-400">76561197960287930</code></li>
                <li>• Profile URL: <code className="text-purple-400">steamcommunity.com/profiles/...</code></li>
                <li>• Vanity URL: <code className="text-purple-400">steamcommunity.com/id/gaben</code></li>
                <li>• Vanity name: <code className="text-purple-400">gaben</code></li>
              </ul>
            </div>

            <input
              type="text"
              value={steamInput}
              onChange={(e) => setSteamInput(e.target.value)}
              placeholder="Steam ID, profile URL, of vanity name"
              className="w-full bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              disabled={steamImportMutation.isPending}
            />

            <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-3 mb-4">
              <p className="text-blue-400 text-xs mb-2">
                💡 <strong>Tip:</strong> Probeer je Steam profile URL of Steam ID
              </p>
              <p className="text-blue-300 text-xs">
                ⚡ <strong>Let op:</strong> Grote wishlists worden in batches geïmporteerd (15 games per keer). Klik meerdere keren op "Importeren" om alle games binnen te halen.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSteamImport(false)}
                className="flex-1 px-4 py-3 bg-[#1e2235] hover:bg-[#252938] text-gray-300 rounded-lg font-medium transition-colors"
                disabled={steamImportMutation.isPending}
              >
                Annuleren
              </button>
              <button
                onClick={() => steamImportMutation.mutate(steamInput)}
                disabled={!steamInput.trim() || steamImportMutation.isPending}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {steamImportMutation.isPending ? 'Importeren...' : 'Importeren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
