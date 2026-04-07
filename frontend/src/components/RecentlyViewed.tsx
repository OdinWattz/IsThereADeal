import { Link } from 'react-router-dom'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { Clock, X } from 'lucide-react'

export function RecentlyViewed() {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed()

  if (recentlyViewed.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Clock size={20} style={{ color: 'var(--accent)' }} />
          Recent bekeken
        </h2>
        <button
          onClick={clearRecentlyViewed}
          className="text-sm flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <X size={14} />
          Wissen
        </button>
      </div>

      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recentlyViewed.map((game) => (
            <Link
              key={game.steam_appid}
              to={`/game/${game.steam_appid}`}
              className="group flex-shrink-0 w-48 rounded-lg overflow-hidden transition-all"
              style={{
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(110, 190, 235, 0.42)',
                boxShadow: '0 2px 10px rgba(40, 110, 165, 0.08)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1278a8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(18, 120, 168, 0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110, 190, 235, 0.42)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(40, 110, 165, 0.08)' }}
            >
              <div className="relative">
                <img
                  src={game.header_image}
                  alt={game.name}
                  className="w-full aspect-[460/215] object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <h3 className="text-xs font-medium line-clamp-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
                  {game.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
