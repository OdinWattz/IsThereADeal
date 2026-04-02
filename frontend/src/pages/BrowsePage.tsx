import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Search, Tag, Award, Star, X, Eye } from 'lucide-react'
import type { Game } from '../api/games'
import api from '../api/client'
import { QuickViewModal } from '../components/QuickViewModal'
import SEO from '../components/SEO'

const SORT_OPTIONS = [
  { value: 'name', label: 'Naam (A-Z)' },
  { value: 'price', label: 'Prijs (Laag-Hoog)' },
  { value: 'discount', label: 'Hoogste Korting' },
  { value: 'metacritic', label: 'Metacritic Score' },
  { value: 'reviews', label: 'Review Score' },
]

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '')
  const [minDiscount, setMinDiscount] = useState(searchParams.get('min_discount') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'name')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [quickViewAppid, setQuickViewAppid] = useState<string | null>(null)

  // Build query params (only CheapShark-supported params)
  const buildParams = () => {
    const params: Record<string, string> = {}
    if (minPrice) params.min_price = minPrice
    if (maxPrice) params.max_price = maxPrice
    if (minDiscount) params.min_discount = minDiscount
    params.sort_by = sortBy
    return params
  }

  const params = buildParams()

  const { data: allGames = [], isLoading } = useQuery({
    queryKey: ['browse', params],
    queryFn: async () => {
      const response = await api.get<Game[]>('/games/browse', { params })
      return response.data
    },
    staleTime: 1000 * 60 * 5,
  })

  // Client-side filter for text search (CheapShark API doesn't support it)
  const games = searchQuery
    ? allGames.filter((game: any) =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allGames

  const clearFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setMinDiscount('')
    setSortBy('name')
    setSearchQuery('')
    setSearchParams({})
  }

  const activeFilterCount = Object.values(buildParams()).filter(v => v && v !== 'name').length + (searchQuery ? 1 : 0)
  const fmt = (v?: number | null) => (v != null ? `€${v.toFixed(2).replace('.', ',')}` : '—')

  return (
    <>
      <SEO
        title="Browse Games - Ontdek Game Deals met Filters"
        description="Doorzoek duizenden games met geavanceerde filters. Filter op prijs, korting, genre en score. Vind exact de game die je zoekt met de beste deals."
        keywords="browse games, game filters, zoek games, games op prijs, games op korting, filter games, gratis games"
        url="https://serpodin.nl/browse"
      />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Search size={32} className="text-purple-400" />
          Browse Games
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Ontdek games met filters tot 90% minimale korting
        </p>
      </div>

      {/* Search Bar + Filters */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op naam..."
            className="w-full bg-[#111320] border border-[#1e2235] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-3 bg-[#111320] border border-[#1e2235] hover:border-purple-500 text-white rounded-lg transition-colors relative flex items-center gap-2"
        >
          <Filter size={20} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 bg-[#111320] border border-[#1e2235] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Filter size={20} />
              Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              <X size={16} />
              Wis Alles
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Price Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Max Prijs</label>
                <span className="text-sm font-semibold text-purple-400">
                  {maxPrice ? `€${maxPrice}` : '∞'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={maxPrice || '100'}
                onChange={(e) => setMaxPrice(e.target.value === '100' ? '' : e.target.value)}
                className="w-full h-2 bg-[#1e2235] rounded-lg appearance-none cursor-pointer accent-purple-600"
                style={{
                  background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${maxPrice || 100}%, #1e2235 ${maxPrice || 100}%, #1e2235 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>€0</span>
                <span>€25</span>
                <span>€50</span>
                <span>€75</span>
                <span>∞</span>
              </div>
            </div>

            {/* Min Discount Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Min Korting</label>
                <span className="text-sm font-semibold text-purple-400">
                  {minDiscount || '0'}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={minDiscount || '0'}
                onChange={(e) => setMinDiscount(e.target.value)}
                className="w-full h-2 bg-[#1e2235] rounded-lg appearance-none cursor-pointer accent-purple-600"
                style={{
                  background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${minDiscount || 0}%, #1e2235 ${minDiscount || 0}%, #1e2235 90%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>90%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSearchParams(buildParams())}
            className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Filters Toepassen
          </button>
        </div>
      )}

      {/* Sort & Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          {isLoading ? 'Laden...' : `${games.length} resultaten`}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400 hidden sm:inline">Sorteer:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setSearchParams({ ...buildParams(), sort_by: e.target.value })
            }}
            className="bg-[#111320] border border-[#1e2235] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-80 bg-[#111320] border border-[#1e2235] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-20">
          <Search size={64} className="mx-auto mb-4 text-gray-600 opacity-30" />
          <p className="text-gray-400 mb-2 text-lg">Geen games gevonden</p>
          <p className="text-gray-500 text-sm mb-4">Probeer andere filters of zoektermen</p>
          <button
            onClick={clearFilters}
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {games.map((game: any) => {
            // Support both Game objects (from DB) and CheapShark deals
            const isCheapSharkDeal = 'sale_price' in game
            const discount = isCheapSharkDeal ? game.discount_percent : Math.max(...(game.prices?.map((p: any) => p.discount_percent) || [0]))
            const isOnSale = isCheapSharkDeal ? discount > 0 : game.prices?.some((p: any) => p.is_on_sale) || false
            const bestPrice = isCheapSharkDeal ? game.sale_price : game.best_price
            const storeName = isCheapSharkDeal ? game.store_name : game.best_store

            return (
              <div
                key={game.steam_appid || game.id}
                className="bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-500 transition-colors group relative"
              >
                {/* Quick View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setQuickViewAppid(game.steam_appid)
                  }}
                  className="absolute top-2 left-2 z-10 p-2 bg-black/70 hover:bg-purple-600 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Quick View"
                >
                  <Eye size={16} />
                </button>

                <Link to={`/game/${game.steam_appid}`}>
                  <div className="relative">
                    <img
                      src={game.header_image || ''}
                      alt={game.name}
                      className="w-full aspect-[460/215] object-cover"
                      loading="lazy"
                    />
                    {isOnSale && discount > 0 && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <Tag size={12} />
                        -{discount}%
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {game.name}
                    </h3>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {game.metacritic_score && (
                        <div className="flex items-center gap-1 text-xs">
                          <Award size={12} className="text-yellow-400" />
                          <span className="text-yellow-400 font-semibold">{game.metacritic_score}</span>
                        </div>
                      )}
                      {game.steam_review_score && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star size={12} className="text-blue-400" />
                          <span className="text-blue-400 font-semibold">{game.steam_review_score}%</span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">{fmt(bestPrice)}</span>
                      {storeName && (
                        <span className="text-xs text-gray-500">via {storeName}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewAppid && (
        <QuickViewModal
          steamAppid={quickViewAppid}
          onClose={() => setQuickViewAppid(null)}
        />
      )}
    </div>
    </>
  )
}
