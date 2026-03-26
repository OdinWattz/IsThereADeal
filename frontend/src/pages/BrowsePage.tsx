import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Search, Tag, Award, Star, X, Eye } from 'lucide-react'
import type { Game } from '../api/games'
import api from '../api/client'
import { QuickViewModal } from '../components/QuickViewModal'

const GENRES = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports',
  'Racing', 'Puzzle', 'Platformer', 'Shooter', 'Fighting', 'Horror',
  'Survival', 'Sandbox', 'MMORPG', 'Indie', 'Casual'
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Naam (A-Z)' },
  { value: 'price', label: 'Prijs (Laag-Hoog)' },
  { value: 'discount', label: 'Hoogste Korting' },
  { value: 'metacritic', label: 'Metacritic Score' },
  { value: 'reviews', label: 'Review Score' },
]

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || '')
  const [onSale, setOnSale] = useState(searchParams.get('on_sale') === 'true')
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'name')
  const [showFilters, setShowFilters] = useState(false)
  const [quickViewAppid, setQuickViewAppid] = useState<string | null>(null)

  // Build query params
  const buildParams = () => {
    const params: Record<string, string> = {}
    if (searchQuery) params.q = searchQuery
    if (selectedGenre) params.genre = selectedGenre
    if (onSale) params.on_sale = 'true'
    params.sort_by = sortBy
    return params
  }

  const params = buildParams()

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['browse', params],
    queryFn: async () => {
      const response = await api.get<Game[]>('/games/browse', { params })
      return response.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const handleSearch = () => {
    setSearchParams(buildParams())
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedGenre('')
    setOnSale(false)
    setSortBy('name')
    setSearchParams({})
  }

  const activeFilterCount = Object.values(buildParams()).filter(v => v && v !== 'name').length
  const fmt = (v?: number | null) => (v != null ? `€${v.toFixed(2).replace('.', ',')}` : '—')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Search size={32} className="text-purple-400" />
          Browse Games
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Ontdek games met geavanceerde filters
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Zoek op naam, developer, publisher, genre..."
            className="w-full bg-[#111320] border border-[#1e2235] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors hidden sm:block"
        >
          Zoek
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-3 bg-[#111320] border border-[#1e2235] hover:border-purple-500 text-white rounded-lg transition-colors relative"
        >
          <Filter size={20} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Alle Genres</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* On Sale Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onSale}
                  onChange={(e) => setOnSale(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-300">Alleen in de aanbieding</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSearch}
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
          {games.map((game) => {
            const maxDiscount = Math.max(...(game.prices?.map((p) => p.discount_percent) || [0]))
            const isOnSale = game.prices?.some((p) => p.is_on_sale) || false

            return (
              <div
                key={game.id}
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
                    {isOnSale && maxDiscount > 0 && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <Tag size={12} />
                        -{maxDiscount}%
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
                      <span className="text-2xl font-bold text-white">{fmt(game.best_price)}</span>
                      {game.best_store && (
                        <span className="text-xs text-gray-500">via {game.best_store}</span>
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
  )
}
