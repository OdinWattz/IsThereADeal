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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
        <Search size={22} style={{ color: 'var(--accent)' }} />
        Zoekresultaten voor &ldquo;{q}&rdquo;
      </h1>
      <p className="text-sm sm:text-base mb-6 sm:mb-7" style={{ color: 'var(--text-secondary)' }}>
        {isLoading ? 'Zoeken...' : `${results.length} ${results.length === 1 ? 'resultaat' : 'resultaten'} gevonden`}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-44 sm:h-52" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Geen games gevonden voor &ldquo;{q}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {results.map((r) => (
            <Link
              key={r.steam_appid}
              to={`/game/${r.steam_appid}`}
              className="block rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.84)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(110, 190, 235, 0.42)',
                boxShadow: '0 3px 12px rgba(40, 110, 165, 0.08)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1278a8'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(18, 120, 168, 0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110, 190, 235, 0.42)'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(40, 110, 165, 0.08)' }}
            >
              <img
                src={r.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${r.steam_appid}/header.jpg`}
                alt={r.name}
                className="w-full h-24 sm:h-28 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm font-medium mb-1.5 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {r.name}
                </p>
                {r.is_in_db && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(18,120,168,0.12)', color: '#1278a8', border: '1px solid rgba(18,120,168,0.25)' }}>
                    bijgehouden
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
