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
      <div
        className="rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: 'rgba(255, 255, 255, 0.84)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(110, 190, 235, 0.42)',
          boxShadow: '0 3px 12px rgba(40, 110, 165, 0.08)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1278a8'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(18, 120, 168, 0.2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110, 190, 235, 0.42)'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(40, 110, 165, 0.08)' }}
      >
        <div className="relative">
          <img
            src={d.header_image}
            alt={d.name}
            className="w-full h-24 sm:h-28 object-cover"
          />
          {d.discount_percent > 0 && (
            <div className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'linear-gradient(135deg, #1ea866, #15924e)', boxShadow: '0 2px 6px rgba(22,154,88,0.3)' }}>
              -{d.discount_percent}%
            </div>
          )}
          {d.store_name && d.store_name !== 'Steam' && (
            <div className="absolute top-2 right-2 text-white text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(18, 120, 168, 0.88)', backdropFilter: 'blur(4px)' }}>
              {d.store_name}
            </div>
          )}
        </div>
        <div className="p-2.5 sm:p-3">
          <p className="text-xs sm:text-sm font-medium mb-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
            {d.name}
          </p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm sm:text-base" style={{ color: 'var(--green)' }}>
              ${d.sale_price.toFixed(2)}
            </span>
            {d.regular_price > d.sale_price && (
              <span className="text-xs line-through" style={{ color: 'var(--text-tertiary)' }}>
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
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
        <TrendingDown size={28} style={{ color: 'var(--green)' }} />
        Deals
      </h1>
      <p className="text-sm sm:text-base mb-6 sm:mb-7" style={{ color: 'var(--text-secondary)' }}>
        {showFeatured ? 'Actuele Steam aanbiedingen' : 'Beste game deals op dit moment, gesorteerd op kwaliteit'}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-44 sm:h-52" />
          ))}
        </div>
      ) : showFeatured ? (
        <>
          <p className="text-xs sm:text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Geen live deals beschikbaar. Dit zijn actuele Steam aanbiedingen —{' '}
            <Link to="/" style={{ color: 'var(--accent)' }}>bekijk de homepage</Link> of zoek een game om prijzen te volgen.
          </p>
          {featuredLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-44 sm:h-52" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {featured.map((g: { steam_appid: string; name: string; header_image?: string; sale_price?: number; discount_percent?: number }) => (
                <Link
                  key={g.steam_appid}
                  to={`/game/${g.steam_appid}`}
                  className="block rounded-xl overflow-hidden transition-colors"
                  style={{ background: 'rgba(255,255,255,0.84)', backdropFilter: 'blur(8px)', border: '1px solid rgba(110, 190, 235, 0.42)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#1278a8'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110, 190, 235, 0.42)'}
                >
                  <img
                    src={g.header_image ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.steam_appid}/header.jpg`}
                    alt={g.name}
                    className="w-full h-24 sm:h-28 object-cover"
                  />
                  <div className="p-2.5 sm:p-3">
                    <p className="text-xs sm:text-sm font-medium mb-1.5 truncate" style={{ color: 'var(--text-primary)' }}>{g.name}</p>
                    <div className="flex items-center gap-2">
                      {g.discount_percent != null && g.discount_percent > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(22,154,88,0.15)', color: 'var(--green)', border: '1px solid rgba(22,154,88,0.3)' }}>
                          -{g.discount_percent}%
                        </span>
                      )}
                      {g.sale_price != null && (
                        <span className="font-semibold text-sm" style={{ color: 'var(--green)' }}>
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
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: page === 0 ? 'rgba(200, 235, 255, 0.4)' : 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(90, 175, 225, 0.4)',
              color: page === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Vorige
          </button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pagina {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: !hasMore ? 'rgba(200, 235, 255, 0.4)' : 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(90, 175, 225, 0.4)',
              color: !hasMore ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              cursor: !hasMore ? 'not-allowed' : 'pointer',
            }}
          >
            Volgende →
          </button>
        </div>
      )}
    </div>
    </>
  )
}
