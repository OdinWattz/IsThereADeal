import { useMemo, useState, useEffect } from 'react'
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
  const [importProgress, setImportProgress] = useState(0)
  const [importStartTime, setImportStartTime] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 50

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wishlist', page],
    queryFn: () => getWishlist(ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    staleTime: 0, // Always fetch fresh data (no caching for now)
    refetchOnMount: 'always', // Force refetch every time
    refetchOnWindowFocus: false,
    gcTime: 0, // Don't cache failed/empty responses (was cacheTime in older versions)
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
    mutationFn: (input: string) => {
      setImportStartTime(Date.now())
      return importSteamWishlist(input)
    },
    onSuccess: (data) => {
      setImportProgress(100)
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
      setPage(0) // Go back to first page after import

      // Reset timer
      setTimeout(() => setImportStartTime(null), 500)
    },
    onError: (error: any) => {
      console.error('Steam import error:', error)
      setImportStartTime(null)

      // Check if this is a timeout error but some games were imported
      // In that case, refresh the wishlist and show partial success
      const errorMsg = error.response?.data?.detail || error.message || 'Import mislukt'

      if (errorMsg.includes('timeout') || errorMsg.includes('timed out') || error.code === 'ECONNABORTED') {
        toast.loading('Timeout - controleren of games zijn toegevoegd...', { duration: 2000 })
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ['wishlist'] })
          toast.success('Check je wishlist - sommige games kunnen zijn toegevoegd. Klik opnieuw op Import om door te gaan.', { duration: 8000 })
        }, 2000)
      } else {
        toast.error(errorMsg, { duration: 8000 })
      }
    },
  })

  // Progress timer effect - must be after steamImportMutation declaration
  useEffect(() => {
    if (steamImportMutation.isPending && importStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - importStartTime
        // Progress up to 95% over 25 seconds
        // 10 games sequentially with parallel APIs + cache = ~22-25s
        const progress = Math.min((elapsed / 25000) * 100, 95)
        setImportProgress(progress)
      }, 100)

      return () => clearInterval(interval)
    } else {
      setImportProgress(0)
    }
  }, [steamImportMutation.isPending, importStartTime])

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

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setPage(0)
  }, [sortBy, filterOnSale, filterTargetMet])

  const targetMetCount = items.filter((item) => {
    const best = item.game.best_price
    const target = item.target_price
    return best != null && target != null && best <= target
  }).length

  const fmt = (v?: number | null) => {
    if (v == null || isNaN(v)) return '—'
    return `€${v.toFixed(2).replace('.', ',')}`
  }

  const getMaxDiscount = (prices: any[]) =>
    Math.max(...prices.map((p) => p.discount_percent || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
            <Heart size={32} style={{color: '#e879a0'}} />
            Verlanglijst
          </h1>
          <p className="text-sm sm:text-base" style={{color: 'var(--text-secondary)'}}>
            {items.length} game{items.length !== 1 ? 's' : ''} getoond (pagina {page + 1})
            {targetMetCount > 0 && (
              <span className="ml-2" style={{color: 'var(--green)'}}>• {targetMetCount} op doelprijs!</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2 btn-aero font-medium text-sm disabled:opacity-50"
            title="Prijzen verversen"
          >
            <RefreshCw size={18} className={isRefetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Ververs</span>
          </button>
          <button
            onClick={() => setShowSteamImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            style={{ background: 'rgba(27,40,56,0.85)', color: '#7ec8f0', border: '1px solid rgba(80,140,190,0.5)' }}
          >
            <Download size={18} />
            <span className="hidden sm:inline">Steam Import</span>
          </button>
        </div>
      </div>

      {/* Target Met Banner */}
      {targetMetCount > 0 && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(23,160,94,0.08)', border: '1px solid rgba(23,160,94,0.3)' }}>
          <p className="font-semibold flex items-center gap-2" style={{color: 'var(--green)'}}>
            🎉 {targetMetCount} game{targetMetCount !== 1 ? 's zijn' : ' is'} op of onder je doelprijs!
          </p>
        </div>
      )}

      {/* Controls */}
      {items.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(90,175,225,0.45)', backdropFilter: 'blur(8px)' }}>
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ArrowUpDown size={18} style={{color: 'var(--text-tertiary)'}} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 sm:flex-initial input-aero rounded-lg px-3 py-2 text-sm"
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
            <Filter size={18} style={{color: 'var(--text-tertiary)'}} />
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{color: 'var(--text-secondary)'}}>
              <input
                type="checkbox"
                checked={filterOnSale}
                onChange={(e) => setFilterOnSale(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1480b8]"
              />
              <span>In de aanbieding</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{color: 'var(--text-secondary)'}}>
              <input
                type="checkbox"
                checked={filterTargetMet}
                onChange={(e) => setFilterTargetMet(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1480b8]"
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
            <div key={i} className="skeleton h-80 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <Heart size={64} className="mx-auto mb-4 opacity-30" style={{color: 'var(--text-tertiary)'}} />
          <p className="mb-4 text-lg" style={{color: 'var(--text-secondary)'}}>Je verlanglijst is leeg</p>
          <p className="mb-6 text-sm" style={{color: 'var(--text-tertiary)'}}>Begin met het toevoegen van games aan je verlanglijst!</p>
          <Link
            to="/search"
            className="inline-flex items-center px-6 py-3 btn-aero font-medium"
          >
            Games zoeken →
          </Link>
        </div>
      ) : processedItems.length === 0 ? (
        /* No Results After Filtering */
        <div className="text-center py-20">
          <Filter size={64} className="mx-auto mb-4 opacity-30" style={{color: 'var(--text-tertiary)'}} />
          <p className="mb-2 text-lg" style={{color: 'var(--text-secondary)'}}>Geen games gevonden</p>
          <p className="text-sm" style={{color: 'var(--text-tertiary)'}}>Probeer je filters aan te passen</p>
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
                className={`rounded-xl overflow-hidden relative group transition-all duration-200`}
                style={{ background: 'rgba(255,255,255,0.84)', border: `1px solid ${targetMet ? 'rgba(23,160,94,0.5)' : 'rgba(110,190,235,0.42)'}`, backdropFilter: 'blur(8px)', boxShadow: '0 3px 12px rgba(40,110,165,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(20,128,184,0.18)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(40,110,165,0.08)' }}
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
                  <div className="absolute top-2 right-2 z-10 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1" style={{background: 'linear-gradient(135deg, #1ea866, #15924e)'}}>
                    <Tag size={12} />
                    -{maxDiscount}%
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  className="absolute top-2 right-2 z-10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'rgba(255,255,255,0.85)', color: '#e05050', border: '1px solid rgba(90,175,225,0.45)', ...(maxDiscount > 0 ? { top: '3.5rem' } : {}) }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)'; (e.currentTarget as HTMLElement).style.color = '#e05050' }}
                  title="Verwijderen"
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
                    className="block font-semibold mb-2 hover:underline transition-colors line-clamp-2"
                    style={{color: 'var(--text-primary)'}}
                  >
                    {item.game.name}
                  </Link>

                  {/* Price Info */}
                  <div className="mb-3">
                    <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>Beste prijs</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold" style={{color: targetMet ? 'var(--green)' : 'var(--text-primary)'}}>
                        {fmt(item.game.best_price)}
                      </span>
                      {item.game.best_store && (
                        <span className="text-xs" style={{color: 'var(--text-tertiary)'}}>via {item.game.best_store}</span>
                      )}
                    </div>
                  </div>

                  {/* Target Price */}
                  <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(220,245,255,0.7)', border: '1px solid rgba(90,175,225,0.35)' }}>
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      <Target size={12} className="text-yellow-400" />
                      Doelprijs
                    </p>
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-1 rounded-md px-2 py-1" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(90,170,215,0.5)' }}>
                          <span className="text-sm" style={{color: 'var(--text-tertiary)'}}>€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none" style={{color: 'var(--text-primary)'}}
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
                  <div className="flex items-center justify-between text-xs" style={{color: 'var(--text-tertiary)'}}>
                    <span>Toegevoegd {new Date(item.added_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                    <Link
                      to={`/game/${item.game.steam_appid}`}
                      className="flex items-center gap-1 transition-colors" style={{color: 'var(--accent)'}}
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

      {/* Pagination Controls */}
      {!isLoading && items.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || isRefetching}
            className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-primary)', backdropFilter: 'blur(8px)' }}
          >
            ← Vorige
          </button>

          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
            Pagina {page + 1}
          </span>

          <button
            onClick={() => setPage(p => p + 1)}
            disabled={items.length < ITEMS_PER_PAGE || isRefetching}
            className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-primary)', backdropFilter: 'blur(8px)' }}
          >
            Volgende →
          </button>
        </div>
      )}

      {/* Steam Import Modal */}
      {showSteamImport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl max-w-md w-full p-6" style={{ background: 'rgba(235,250,255,0.96)', border: '1px solid rgba(90,175,225,0.5)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(40,100,160,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                <Download size={24} style={{color: '#1480b8'}} />
                Steam Wishlist Importeren
              </h2>
              <button
                onClick={() => setShowSteamImport(false)}
                className="p-2 rounded-lg transition-colors"
                style={{color: 'var(--text-tertiary)'}}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(90,175,225,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                Importeer je publieke Steam wishlist. Werkt met:
              </p>
              <ul className="text-xs space-y-1 mb-4" style={{color: 'var(--text-tertiary)'}}>
                <li>• Steam ID: <code style={{color: 'var(--accent)'}}>76561197960287930</code></li>
                <li>• Profile URL: <code style={{color: 'var(--accent)'}}>steamcommunity.com/profiles/...</code></li>
                <li>• Vanity URL: <code style={{color: 'var(--accent)'}}>steamcommunity.com/id/gaben</code></li>
                <li>• Vanity name: <code style={{color: 'var(--accent)'}}>gaben</code></li>
              </ul>
            </div>

            <input
              type="text"
              value={steamInput}
              onChange={(e) => setSteamInput(e.target.value)}
              placeholder="Steam ID, profile URL, of vanity name"
              className="w-full input-aero px-4 py-3 mb-4"
              disabled={steamImportMutation.isPending}
            />

            <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(20,128,184,0.08)', border: '1px solid rgba(20,128,184,0.25)' }}>
              <p className="text-xs mb-2" style={{color: '#1480b8'}}>
                💡 <strong>Tip:</strong> Probeer je Steam profile URL of Steam ID
              </p>
              <p className="text-xs mb-2" style={{color: '#0d6799'}}>
                ⚡ <strong>Batch import:</strong> Grote wishlists worden in batches geïmporteerd (10 games per keer). Klik meerdere keren op "Importeren" om alle games binnen te halen.
              </p>
              <p className="text-xs" style={{color: 'var(--green)'}}>
                🚀 <strong>Anti rate-limit:</strong> Je wishlist wordt 10 min gecached. Daarna kun je onbeperkt importeren zonder Steam opnieuw te vragen!
              </p>
            </div>

            {/* Progress Bar */}
            {steamImportMutation.isPending && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Importeren...</span>
                  <span className="text-xs text-gray-500">
                    {importStartTime && `${Math.floor((Date.now() - importStartTime) / 1000)}s / ~25s max`}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(160,210,240,0.3)' }}>
                  <div
                    className="h-full transition-all duration-300 ease-out"
                    style={{ width: `${importProgress}%`, background: 'linear-gradient(90deg, #0ab5d8, #1480b8)' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Games worden opgehaald en prijzen worden verzameld...
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSteamImport(false)}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-secondary)' }}
                disabled={steamImportMutation.isPending}
              >
                Annuleren
              </button>
              <button
                onClick={() => steamImportMutation.mutate(steamInput)}
                disabled={!steamInput.trim() || steamImportMutation.isPending}
                className="flex-1 px-4 py-3 btn-aero font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
