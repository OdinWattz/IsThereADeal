import { useQuery } from '@tanstack/react-query'
import { getDeals, getFeaturedDeals } from '../api/games'
import { GameCard } from '../components/GameCard'
import { useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DealsPage() {
  const [page, setPage] = useState(0)
  const limit = 20

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', page],
    queryFn: () => getDeals(page * limit, limit),
    staleTime: 1000 * 60 * 5,
  })

  // Fall back to Steam featured deals when the DB has no tracked games yet
  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeaturedDeals,
    staleTime: 1000 * 60 * 10,
    enabled: deals.length === 0 && !isLoading,
  })

  const showFeatured = deals.length === 0 && !isLoading

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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TrendingDown size={28} color="#4ade80" /> Deals
      </h1>
      <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '0.9rem' }}>Games die nu in de aanbieding zijn bij bijgehouden winkels</p>

      {isLoading ? (
        <div style={gridStyle}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: '#111320', borderRadius: '12px', height: '200px' }} />
          ))}
        </div>
      ) : showFeatured ? (
        <>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '16px' }}>
            Geen bijgehouden deals gevonden. Dit zijn actuele Steam aanbiedingen —{' '}
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
              {featured.map((g: {steam_appid: string; name: string; header_image?: string; sale_price?: number; original_price?: number; discount_percent?: number}) => (
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
          {deals.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={pageBtnStyle(page === 0)}>
          ← Vorige
        </button>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Pagina {page + 1}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={deals.length < limit} style={pageBtnStyle(deals.length < limit)}>
          Volgende →
        </button>
      </div>
    </div>
  )
}
