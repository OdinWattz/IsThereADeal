import { useQuery } from '@tanstack/react-query'
import { getFreeGames } from '../api/games'
import { getCurrentFreebies } from '../api/freebies'
import { Link } from 'react-router-dom'
import { Gift, ExternalLink } from 'lucide-react'
import SEO from '../components/SEO'

export function FreeGamesPage() {
  const { data: freeGames = [], isLoading } = useQuery({
    queryKey: ['freeGames'],
    queryFn: () => getFreeGames(50),
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const { data: epicFreebies } = useQuery({
    queryKey: ['epicFreebies'],
    queryFn: getCurrentFreebies,
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const epicGames = epicFreebies?.epic ?? []
  const primeGames = epicFreebies?.prime ?? []
  const hasLiveFreebies = epicGames.length > 0 || primeGames.length > 0

  return (
    <>
      <SEO
        title="Gratis Games - Free-to-Play & Tijdelijke Gratis Aanbiedingen"
        description="Ontdek gratis games van verschillende platforms. Free-to-play games en tijdelijke gratis aanbiedingen. Claim nu je gratis games!"
        keywords="gratis games, free games, free to play, gratis pc games, free games steam, gratis game aanbiedingen, claim gratis games"
        url="/free"
      />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Gift size={32} className="text-green-400" />
          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Gratis Games
          </h1>
        </div>
        <p
          className="text-base sm:text-lg max-w-2xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          Ontdek gratis games van verschillende platforms. Free-to-play games en tijdelijke gratis aanbiedingen.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg h-56 skeleton"
            />
          ))}
        </div>
      )}

      {/* Live Freebies (Epic / Prime) */}
      {hasLiveFreebies && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0a2038', marginBottom: '16px' }}>
            ⚡ Nu Tijdelijk Gratis
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {[...epicGames.map(g => ({ ...g, source: 'epic', badge_color: '#0078f2', badge_bg: 'rgba(0,120,242,0.08)', badge_label: '⚡ Epic Games' })),
              ...primeGames.map(g => ({ ...g, source: 'prime', badge_color: '#ff9900', badge_bg: 'rgba(255,153,0,0.08)', badge_label: '👑 Prime Gaming' }))
            ].map((g, i) => (
              <div
                key={i}
                style={{ border: '1px solid rgba(90,175,225,0.2)', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(8,32,56,0.06)' }}
              >
                {g.thumbnail && (
                  <img src={g.thumbnail} alt={g.title} style={{ width: '100%', height: '110px', objectFit: 'cover' }} loading="lazy" />
                )}
                <div style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: g.badge_color, backgroundColor: g.badge_bg, padding: '2px 7px', borderRadius: '4px' }}>
                    {g.badge_label}
                  </span>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0a2038', margin: '8px 0 4px', lineHeight: 1.3 }}>{g.title}</p>
                  {g.original_price && g.original_price > 0 && (
                    <p style={{ fontSize: '0.75rem', color: '#7aabcc', margin: '0 0 10px' }}>
                      <span style={{ textDecoration: 'line-through' }}>€{g.original_price.toFixed(2)}</span>
                      {' '}<span style={{ color: '#169a58', fontWeight: 700 }}>Gratis!</span>
                    </p>
                  )}
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '6px', backgroundColor: g.badge_color, color: '#fff', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Claimen <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Games Grid */}
      {!isLoading && freeGames.length === 0 && (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-secondary)'
          }}
        >
          <Gift size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg">Geen gratis games beschikbaar op dit moment</p>
        </div>
      )}

      {!isLoading && freeGames.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {freeGames.map((game) => (
            <div
              key={game.steam_appid}
              className="border rounded-lg overflow-hidden transition-all duration-200 flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.84)',
                border: '1px solid rgba(110,190,235,0.42)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 3px 12px rgba(40,110,165,0.08)'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1ea866'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(30,168,102,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,190,235,0.42)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(40,110,165,0.08)' }}
            >
              {/* Game Image */}
              <Link
                to={`/game/${game.steam_appid}`}
                className="block relative group"
              >
                <img
                  src={game.header_image}
                  alt={game.name}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <Gift size={14} />
                  GRATIS
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Bekijk Details</span>
                </div>
              </Link>

              {/* Game Info */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <Link
                  to={`/game/${game.steam_appid}`}
                  className="block"
                >
                  <h3
                    className="text-sm font-medium mb-2 line-clamp-2 hover:text-green-400 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {game.name}
                  </h3>
                </Link>

                <div className="space-y-2">
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {game.store_name}
                  </p>

                  {/* External Link Button */}
                  <a
                    href={game.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                  >
                    <span>Claim Now</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
