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

const PAGE_SIZE = 60

interface BrowseResponse {
  items: Game[]
  has_more: boolean
}

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '')
  const [minDiscount, setMinDiscount] = useState(searchParams.get('min_discount') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'name')
  const [page, setPage] = useState(Number(searchParams.get('page') || '0'))
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
    params.page = String(page)
    params.limit = String(PAGE_SIZE)
    return params
  }

  const params = buildParams()

  const { data, isLoading } = useQuery({
    queryKey: ['browse', params],
    queryFn: async () => {
      const response = await api.get<BrowseResponse>('/games/browse', { params })
      return response.data
    },
    staleTime: 1000 * 60 * 5,
  })
  const allGames = data?.items || []
  const hasMore = data?.has_more || false

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
    setPage(0)
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
          <Search size={32} style={{color: 'var(--accent)'}} />
          Browse Games
        </h1>
        <p className="text-sm sm:text-base" style={{color: 'var(--text-secondary)'}}>
          Ontdek games met filters tot 100% minimale korting
        </p>
      </div>

      {/* Search Bar + Filters */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: 'var(--text-tertiary)'}} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op naam..."
            className="w-full input-aero pl-10 pr-4 py-3 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-3 rounded-lg transition-all relative flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-primary)', backdropFilter: 'blur(8px)' }}
        >
          <Filter size={20} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{background: '#1480b8'}}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(90,175,225,0.45)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(50,120,170,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
              <Filter size={20} />
              Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm flex items-center gap-1" style={{color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer'}}
            >
              <X size={16} />
              Wis Alles
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Price Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Max Prijs</label>
                <span className="text-sm font-semibold" style={{color: 'var(--accent)'}}>
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
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#1480b8]"
                style={{
                  background: `linear-gradient(to right, #1480b8 0%, #1480b8 ${maxPrice || 100}%, rgba(160,210,240,0.4) ${maxPrice || 100}%, rgba(160,210,240,0.4) 100%)`
                }}
              />
              <div className="flex justify-between text-xs mt-1" style={{color: 'var(--text-tertiary)'}}>
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
                <label className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Min Korting</label>
                <span className="text-sm font-semibold" style={{color: 'var(--accent)'}}>
                  {minDiscount || '0'}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minDiscount || '0'}
                onChange={(e) => setMinDiscount(e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#1480b8]"
                style={{
                  background: `linear-gradient(to right, #1480b8 0%, #1480b8 ${minDiscount || 0}%, rgba(160,210,240,0.4) ${minDiscount || 0}%, rgba(160,210,240,0.4) 100%)`
                }}
              />
              <div className="flex justify-between text-xs mt-1" style={{color: 'var(--text-tertiary)'}}>
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setPage(0)
              setSearchParams({ ...buildParams(), page: '0', limit: String(PAGE_SIZE) })
            }}
            className="mt-4 w-full px-4 py-2 btn-aero font-medium"
          >
            Filters Toepassen
          </button>
        </div>
      )}

      {/* Sort & Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
          {isLoading ? 'Laden...' : `${games.length} resultaten op pagina ${page + 1}`}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm hidden sm:inline" style={{color: 'var(--text-secondary)'}}>Sorteer:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(0)
              setSearchParams({ ...buildParams(), sort_by: e.target.value, page: '0', limit: String(PAGE_SIZE) })
            }}
            className="input-aero rounded-lg px-3 py-2 text-sm"
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
            <div key={i} className="skeleton h-80 rounded-xl" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-20">
          <Search size={64} className="mx-auto mb-4 opacity-30" style={{color: 'var(--text-tertiary)'}} />
          <p className="mb-2 text-lg" style={{color: 'var(--text-secondary)'}}>Geen games gevonden</p>
          <p className="text-sm mb-4" style={{color: 'var(--text-tertiary)'}}>Probeer andere filters of zoektermen</p>
          <button
            onClick={clearFilters}
            className="font-medium" style={{color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer'}}
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
                className="rounded-xl overflow-hidden group relative transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(110,190,235,0.42)', backdropFilter: 'blur(8px)', boxShadow: '0 3px 12px rgba(40,110,165,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1480b8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(20,128,184,0.2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,190,235,0.42)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(40,110,165,0.08)' }}
              >
                {/* Quick View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setQuickViewAppid(game.steam_appid)
                  }}
                  className="absolute top-2 left-2 z-10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(90,175,225,0.45)', color: '#1480b8' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1480b8'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)'; (e.currentTarget as HTMLElement).style.color = '#1480b8' }}
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
                      <div className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1" style={{background: 'linear-gradient(135deg, #1ea866, #15924e)'}}>
                        <Tag size={12} />
                        -{discount}%
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2 transition-colors" style={{color: 'var(--text-primary)'}}>
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
                      <span className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{fmt(bestPrice)}</span>
                      {storeName && (
                        <span className="text-xs" style={{color: 'var(--text-tertiary)'}}>via {storeName}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && games.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            disabled={page === 0}
            onClick={() => {
              const nextPage = Math.max(0, page - 1)
              setPage(nextPage)
              setSearchParams({ ...buildParams(), page: String(nextPage), limit: String(PAGE_SIZE) })
            }}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-primary)', backdropFilter: 'blur(8px)' }}
          >
            Vorige
          </button>
          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Pagina {page + 1}</span>
          <button
            disabled={!(hasMore || games.length >= PAGE_SIZE)}
            onClick={() => {
              const nextPage = page + 1
              setPage(nextPage)
              setSearchParams({ ...buildParams(), page: String(nextPage), limit: String(PAGE_SIZE) })
            }}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-primary)', backdropFilter: 'blur(8px)' }}
          >
            Volgende
          </button>
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
