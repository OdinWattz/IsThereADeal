import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Filter, ChevronDown } from 'lucide-react'
import api from '../api/client'

interface BrowseGame {
  steam_appid: string
  name: string
  sale_price: number
  regular_price: number
  discount_percent: number
  store_name: string
  header_image: string
  deal_rating: number
}

interface BrowseResponse {
  items: BrowseGame[]
  has_more: boolean
  total_fetched: number
}

const STORES = [
  { id: '', name: 'Alle winkels' },
  { id: '1', name: 'Steam' },
  { id: '7', name: 'GOG' },
  { id: '11', name: 'Humble Store' },
  { id: '3', name: 'GreenManGaming' },
  { id: '13', name: 'Fanatical' },
  { id: '25', name: 'Epic Games' },
  { id: '2', name: 'GamersGate' },
  { id: '8', name: 'Origin' },
]

const SORT_OPTIONS = [
  { value: 'DealRating', label: 'Beste deals' },
  { value: 'Price', label: 'Prijs (laag → hoog)' },
  { value: 'Savings', label: 'Hoogste korting' },
  { value: 'Recent', label: 'Nieuwste deals' },
]

export function BrowsePage() {
  const [page, setPage] = useState(0)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(999)
  const [minDiscount, setMinDiscount] = useState(0)
  const [sortBy, setSortBy] = useState('DealRating')
  const [storeId, setStoreId] = useState('')
  const [showFilters, setShowFilters] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['browse', page, minPrice, maxPrice, minDiscount, sortBy, storeId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '60',
        min_price: minPrice.toString(),
        max_price: maxPrice.toString(),
        min_discount: minDiscount.toString(),
        sort_by: sortBy,
      })
      if (storeId) params.append('store_id', storeId)

      const response = await api.get<BrowseResponse>(`/games/browse?${params}`)
      return response.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const games = data?.items || []
  const hasMore = data?.has_more || false

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  const resetFilters = () => {
    setMinPrice(0)
    setMaxPrice(999)
    setMinDiscount(0)
    setSortBy('DealRating')
    setStoreId('')
    setPage(0)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Browse Games</h1>
        <p className="text-gray-400 text-sm">
          Ontdek duizenden games op sale. Alle content inclusief adult games.
        </p>
      </div>

      {/* Filters Toggle Button (Mobile) */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="md:hidden w-full flex items-center justify-between bg-[#111320] border border-[#1e2235] rounded-lg px-4 py-3 mb-4 text-white"
      >
        <span className="flex items-center gap-2">
          <Filter size={18} />
          Filters
        </span>
        <ChevronDown
          size={18}
          className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
        />
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filters */}
        <div
          className={`${
            showFilters ? 'block' : 'hidden'
          } md:block w-full md:w-64 flex-shrink-0`}
        >
          <div className="bg-[#111320] border border-[#1e2235] rounded-xl p-5 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <button
                onClick={resetFilters}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Reset
              </button>
            </div>

            {/* Sort By */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sorteer op
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setPage(0)
                }}
                className="w-full bg-[#0d0f1a] border border-[#1e2235] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Store Filter */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Winkel
              </label>
              <select
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value)
                  setPage(0)
                }}
                className="w-full bg-[#0d0f1a] border border-[#1e2235] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {STORES.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prijs (USD)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  placeholder="Min"
                  min="0"
                  className="w-full bg-[#0d0f1a] border border-[#1e2235] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  placeholder="Max"
                  min="0"
                  className="w-full bg-[#0d0f1a] border border-[#1e2235] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Discount Range */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimale korting: {minDiscount}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minDiscount}
                onChange={(e) => {
                  setMinDiscount(Number(e.target.value))
                  setPage(0)
                }}
                className="w-full h-2 bg-[#1e2235] rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => setPage(0)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Filters toepassen
            </button>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t border-[#1e2235]">
              <p className="text-xs text-gray-500 text-center">
                {games.length} resultaten gevonden
              </p>
            </div>
          </div>
        </div>

        {/* Games Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[#111320] border border-[#1e2235] rounded-xl h-64 animate-pulse"
                />
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-2">Geen games gevonden</p>
              <p className="text-gray-500 text-sm mb-4">
                Probeer andere filters
              </p>
              <button
                onClick={resetFilters}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {games.map((game) => (
                  <Link
                    key={game.steam_appid}
                    to={`/game/${game.steam_appid}`}
                    className="group bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-500 transition-all"
                  >
                    <div className="relative">
                      <img
                        src={game.header_image}
                        alt={game.name}
                        className="w-full aspect-[460/215] object-cover"
                        loading="lazy"
                      />
                      {game.discount_percent > 0 && (
                        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                          -{game.discount_percent}%
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {game.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-green-400 font-bold text-lg">
                            ${game.sale_price.toFixed(2)}
                          </div>
                          {game.discount_percent > 0 && (
                            <div className="text-gray-500 text-xs line-through">
                              ${game.regular_price.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {game.store_name}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-[#111320] border border-[#1e2235] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 transition-colors"
                >
                  Vorige
                </button>
                <span className="text-gray-400 text-sm">Pagina {page + 1}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="px-4 py-2 bg-[#111320] border border-[#1e2235] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 transition-colors"
                >
                  Volgende
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
