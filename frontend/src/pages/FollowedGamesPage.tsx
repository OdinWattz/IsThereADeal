import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFollowedGames, unfollowGame } from '../api/games'
import { Link } from 'react-router-dom'
import { Star, X, Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'

export function FollowedGamesPage() {
  const queryClient = useQueryClient()

  const { data: followed = [], isLoading } = useQuery({
    queryKey: ['followed'],
    queryFn: getFollowedGames,
  })

  const unfollowMutation = useMutation({
    mutationFn: (id: number) => unfollowGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed'] })
      toast.success('Game ontvolgd')
    },
    onError: () => {
      toast.error('Kon game niet ontvolgen')
    },
  })

  const handleUnfollow = (id: number, gameName: string) => {
    if (confirm(`"${gameName}" ontvolgen?`)) {
      unfollowMutation.mutate(id)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Star size={32} className="text-yellow-400" />
          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Gevolgde Games
          </h1>
        </div>
        <p
          className="text-base sm:text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          Blijf op de hoogte van je favoriete games
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg h-56 animate-pulse"
              style={{ backgroundColor: 'var(--bg-card)' }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && followed.length === 0 && (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-secondary)'
          }}
        >
          <Star size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg mb-2">Je volgt nog geen games</p>
          <p className="text-sm mb-4">Ontdek games en volg ze om updates te ontvangen</p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/deals"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Bekijk Deals
            </Link>
            <Link
              to="/browse"
              className="px-4 py-2 border rounded-lg hover:border-purple-500 transition-colors"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)'
              }}
            >
              Browse Games
            </Link>
          </div>
        </div>
      )}

      {/* Games Grid */}
      {!isLoading && followed.length > 0 && (
        <>
          <div
            className="mb-4 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {followed.length} {followed.length === 1 ? 'game' : 'games'} gevolgd
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {followed.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden hover:border-purple-500 transition-all group relative"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-secondary)'
                }}
              >
                {/* Unfollow Button */}
                <button
                  onClick={() => handleUnfollow(item.id, item.game.name)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Ontvolgen"
                >
                  <X size={14} />
                </button>

                {/* Game Image */}
                <Link to={`/game/${item.game.steam_appid}`} className="block relative">
                  <img
                    src={item.game.header_image}
                    alt={item.game.name}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                {/* Game Info */}
                <div className="p-3">
                  <Link to={`/game/${item.game.steam_appid}`}>
                    <h3
                      className="text-sm font-medium mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.game.name}
                    </h3>
                  </Link>

                  {/* Best Price */}
                  {item.game.best_price !== undefined && item.game.best_price !== null && (
                    <p className="text-sm text-green-400 font-semibold mb-2">
                      €{item.game.best_price.toFixed(2).replace('.', ',')}
                    </p>
                  )}

                  {/* Notification Status */}
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {item.notify_on_sale ? (
                      <Bell size={12} className="text-green-400" />
                    ) : (
                      <BellOff size={12} className="text-gray-500" />
                    )}
                    <span>
                      {item.notify_on_sale ? 'Meldingen aan' : 'Meldingen uit'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
