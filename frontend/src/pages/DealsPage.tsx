import { useQuery } from '@tanstack/react-query'
import { getDeals, getFeaturedDeals, type TrendingDeal } from '../api/games'
import { useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DealsPage() {
  const [page, setPage] = useState(0)
  const limit = 20

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', page],
    queryFn: () => getDeals(page, limit),
    staleTime: 1000 * 60 * 5,
  })

  // Only fall back to Steam featured when CheapShark returns nothing at all
  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeaturedDeals,
    staleTime: 1000 * 60 * 10,
    enabled: deals.length === 0 && !isLoading,
  })

  const showFeatured = deals.length === 0 && !isLoading
  const hasMore = deals.length >= limit

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  }

  const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    backgroundColor: '#111320',
    border: `1px solid ${disabled ? '#1e2235' : '#2a2d3e'}`,
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: disabled ? '#334155' : '#cbd5e1',
    cursor: disabled ? 'not-allowed' : 'pointer',
  })

  const DealCard = ({ d }: { d: TrendingDeal }) => (
    <Link to={`/game/${d.steam_appid}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          backgroundColor: '#111320',
          border: '1px solid #1e2235',
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#7c3aed'
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = '0 8px 24px rgba(124,58,237,0.15)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#1e2235'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={d.header_image}
            alt={d.name}
            style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
          />
          {d.discount_percent > 0 && (
            <div style={{
              position: 'absolute', top: '8px', left: '8px',
              backgroundColor: '#16a34a', color: '#fff',
              fontSize: '0.7rem', fontWeight: 700,
              padding: '3px 7px', borderRadius: '6px',
            }}>
              -{d.discount_percent}%
            </div>
          )}
          {d.store_name && d.store_name !== 'Steam' && (
            <div style={{
              position: 'absolute', top: '8px', right: '8px',
              backgroundColor: 'rgba(124,58,237,0.9)', color: '#fff',
              fontSize: '0.65rem', padding: '3px 6px', borderRadius: '6px',
            }}>
              {d.store_name}
            </div>
          )}
        </div>
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#e2e8f0', marginBottom: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {d.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.85rem' }}>
              ${d.sale_price.toFixed(2)}
            </span>
            {d.regular_price > d.sale_price && (
              <span style={{ color: '#64748b', fontSize: '0.75rem', textDecoration: 'line-through' }}>
                ${d.regular_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TrendingDown size={28} color="#4ade80" /> Deals
      </h1>
      <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '0.9rem' }}>
        {showFeatured ? 'Actuele Steam aanbiedingen' : 'Beste game deals op dit moment, gesorteerd op kwaliteit'}
      </p>

      {isLoading ? (
        <div style={gridStyle}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: '#111320', borderRadius: '12px', height: '200px' }} />
          ))}
        </div>
      ) : showFeatured ? (
        <>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '16px' }}>
            Geen live deals beschikbaar. Dit zijn actuele Steam aanbiedingen —{' '}
            <Link to="/" style={{ color: '#a78bfa', textDecoration: 'none' }}>bekijk de homepage</Link> of zoek een game om prijzen te volgen.
          </p>
          {featuredLoading ? (
            <div style={gridStyle}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} style={{ backgroundColor: '#111320', borderRadius: '12px', height: '200px' }} />
              ))}
            </div>
          ) : (
            <div style={gridStyle}>
              {featured.map((g: { steam_appid: string; name: string; header_image?: string; sale_price?: number; original_price?: number; discount_percent?: number }) => (
                <Link key={g.steam_appid} to={`/game/${g.steam_appid}`} style={{ textDecoration: 'none' }}>
                  <div style={{ backgroundColor: '#111320', border: '1px solid #1e2235', borderRadius: '12px', overflow: 'hidden', transition: 'border-color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2d3e')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e2235')}>
                    <img src={g.header_image ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.steam_appid}/header.jpg`}
                      alt={g.name} style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#e2e8f0', marginBottom: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{g.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {g.discount_percent ? (
                          <span style={{ backgroundColor: '#166534', color: '#4ade80', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>-{g.discount_percent}%</span>
                        ) : null}
                        {g.sale_price != null ? (
                          <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.85rem' }}>€{g.sale_price.toFixed(2).replace('.', ',')}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={gridStyle}>
          {deals.map((d: TrendingDeal) => (
            <DealCard key={`${d.steam_appid}-${d.store_name}`} d={d} />
          ))}
        </div>
      )}

      {/* Only show pagination when we have real CheapShark deals */}
      {!showFeatured && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={pageBtnStyle(page === 0)}>
            ← Vorige
          </button>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Pagina {page + 1}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={!hasMore} style={pageBtnStyle(!hasMore)}>
            Volgende →
          </button>
        </div>
      )}
    </div>
  )
}

