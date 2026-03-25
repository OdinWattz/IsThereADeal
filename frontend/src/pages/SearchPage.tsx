import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchGames } from '../api/games'
import { Search } from 'lucide-react'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchGames(q),
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Search size={22} color="#a78bfa" />
        Zoekresultaten voor &ldquo;{q}&rdquo;
      </h1>
      <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '0.9rem' }}>
        {isLoading ? 'Zoeken...' : `${results.length} ${results.length === 1 ? 'resultaat' : 'resultaten'} gevonden`}
      </p>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: '#111320', borderRadius: '12px', height: '200px' }} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p style={{ color: '#64748b' }}>Geen games gevonden voor &ldquo;{q}&rdquo;.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {results.map((r) => (
            <Link
              key={r.steam_appid}
              to={`/game/${r.steam_appid}`}
              style={{ textDecoration: 'none' }}
            >
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
                <img
                  src={r.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${r.steam_appid}/header.jpg`}
                  alt={r.name}
                  style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <div style={{ padding: '10px 12px' }}>
                  <p style={{
                    fontSize: '0.82rem', fontWeight: 500, color: '#e2e8f0',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    lineHeight: '1.4', marginBottom: '6px',
                  }}>
                    {r.name}
                  </p>
                  {r.is_in_db && (
                    <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa', padding: '2px 7px', borderRadius: '999px' }}>
                      bijgehouden
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
