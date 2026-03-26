import { useQuery } from '@tanstack/react-query'
import { getFreeGames } from '../api/games'
import { Link } from 'react-router-dom'
import { Gift, ExternalLink } from 'lucide-react'

export function FreeGamesPage() {
  const { data: freeGames = [], isLoading } = useQuery({
    queryKey: ['freeGames'],
    queryFn: () => getFreeGames(50),
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  return (
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
              className="rounded-lg h-56 animate-pulse"
              style={{ backgroundColor: 'var(--bg-card)' }}
            />
          ))}
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
              className="border rounded-lg overflow-hidden hover:border-green-500 transition-all duration-200 flex flex-col"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-secondary)'
              }}
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
  )
}
