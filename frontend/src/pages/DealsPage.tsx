import { useQuery } from '@tanstack/react-query'
import { getDeals, getFeaturedDeals, type TrendingDeal } from '../api/games'
import { useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export function DealsPage() {
  const [page, setPage] = useState(0)
  const limit = 20

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', page],
    queryFn: () => getDeals(page, limit),
    staleTime: 1000 * 60 * 5,
  })

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeaturedDeals,
    staleTime: 1000 * 60 * 10,
    enabled: deals.length === 0 && !isLoading,
  })

  const showFeatured = deals.length === 0 && !isLoading
  const hasMore = deals.length >= limit

  const DealCard = ({ d }: { d: TrendingDeal }) => (
    <Link to={`/game/${d.steam_appid}`} className="block">
      <div className="bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-600/15 transition-all duration-200">
        <div className="relative">
          <img
            src={d.header_image}
            alt={d.name}
            className="w-full h-24 sm:h-28 object-cover"
          />
          {d.discount_percent > 0 && (
            <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
              -{d.discount_percent}%
            </div>
          )}
          {d.store_name && d.store_name !== 'Steam' && (
            <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-[10px] px-1.5 py-0.5 rounded">
              {d.store_name}
            </div>
          )}
        </div>
        <div className="p-2.5 sm:p-3">
          <p className="text-xs sm:text-sm font-medium text-gray-200 mb-1.5 truncate">
            {d.name}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-semibold text-sm sm:text-base">
              ${d.sale_price.toFixed(2)}
            </span>
            {d.regular_price > d.sale_price && (
              <span className="text-gray-500 text-xs line-through">
                ${d.regular_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <>
      <SEO
        title="Beste Game Deals | Trending Aanbiedingen"
        description="Ontdek de beste game deals van dit moment. Bekijk trending aanbiedingen gesorteerd op kwaliteit van Steam, GOG, Humble Bundle en meer."
        keywords="game deals, beste game aanbiedingen, trending games, game kortingen, steam sale, gog sale"
        url="https://serpodin.nl/deals"
      />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <TrendingDown size={28} className="text-green-400" />
        Deals
      </h1>
      <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-7">
        {showFeatured ? 'Actuele Steam aanbiedingen' : 'Beste game deals op dit moment, gesorteerd op kwaliteit'}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="bg-[#111320] rounded-xl h-44 sm:h-52 animate-pulse" />
          ))}
        </div>
      ) : showFeatured ? (
        <>
          <p className="text-gray-400 text-xs sm:text-sm mb-4">
            Geen live deals beschikbaar. Dit zijn actuele Steam aanbiedingen —{' '}
            <Link to="/" className="text-purple-400 hover:text-purple-300">bekijk de homepage</Link> of zoek een game om prijzen te volgen.
          </p>
          {featuredLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="bg-[#111320] rounded-xl h-44 sm:h-52 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {featured.map((g: { steam_appid: string; name: string; header_image?: string; sale_price?: number; discount_percent?: number }) => (
                <Link key={g.steam_appid} to={`/game/${g.steam_appid}`} className="block bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden hover:border-[#2a2d3e] transition-colors">
                  <img
                    src={g.header_image ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.steam_appid}/header.jpg`}
                    alt={g.name}
                    className="w-full h-24 sm:h-28 object-cover"
                  />
                  <div className="p-2.5 sm:p-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-200 mb-1.5 truncate">{g.name}</p>
                    <div className="flex items-center gap-2">
                      {g.discount_percent != null && g.discount_percent > 0 && (
                        <span className="bg-green-900 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          -{g.discount_percent}%
                        </span>
                      )}
                      {g.sale_price != null && (
                        <span className="text-green-400 font-semibold text-sm">
                          €{g.sale_price.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {deals.map((d: TrendingDeal) => (
            <DealCard key={`${d.steam_appid}-${d.store_name}`} d={d} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!showFeatured && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={`px-4 py-2 bg-[#111320] border rounded-lg text-sm transition-colors ${
              page === 0
                ? 'border-[#1e2235] text-gray-600 cursor-not-allowed'
                : 'border-[#2a2d3e] text-gray-300 hover:border-purple-600 hover:text-white'
            }`}
          >
            ← Vorige
          </button>
          <span className="text-sm text-gray-400">Pagina {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className={`px-4 py-2 bg-[#111320] border rounded-lg text-sm transition-colors ${
              !hasMore
                ? 'border-[#1e2235] text-gray-600 cursor-not-allowed'
                : 'border-[#2a2d3e] text-gray-300 hover:border-purple-600 hover:text-white'
            }`}
          >
            Volgende →
          </button>
        </div>
      )}
    </div>
    </>
  )
}
