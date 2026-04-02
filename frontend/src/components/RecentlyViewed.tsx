import { Link } from 'react-router-dom'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { Clock, X } from 'lucide-react'

export function RecentlyViewed() {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed()

  if (recentlyViewed.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
          <Clock size={20} className="text-purple-400" />
          Recent bekeken
        </h2>
        <button
          onClick={clearRecentlyViewed}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <X size={14} />
          Wissen
        </button>
      </div>

      {/* Horizontal scrollable container */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800">
          {recentlyViewed.map((game) => (
            <Link
              key={game.steam_appid}
              to={`/game/${game.steam_appid}`}
              className="group flex-shrink-0 w-48 bg-[#0a0a0a] border border-[#222222] rounded-lg overflow-hidden hover:border-purple-500 transition-all"
            >
              <div className="relative">
                <img
                  src={game.header_image}
                  alt={game.name}
                  className="w-full aspect-[460/215] object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-2">
                <h3 className="text-white text-xs font-medium line-clamp-2 group-hover:text-purple-400 transition-colors">
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
