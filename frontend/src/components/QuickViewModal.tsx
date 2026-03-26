import { useQuery } from '@tanstack/react-query'
import { X, ExternalLink, Heart, Bell, Award, Star, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Game } from '../api/games'
import api from '../api/client'

interface QuickViewModalProps {
  steamAppid: string
  onClose: () => void
}

export function QuickViewModal({ steamAppid, onClose }: QuickViewModalProps) {
  const { data: game, isLoading } = useQuery({
    queryKey: ['game-quick', steamAppid],
    queryFn: async () => {
      const response = await api.get<Game>(`/games/${steamAppid}`)
      return response.data
    },
  })

  const fmt = (v?: number | null) => (v != null ? `€${v.toFixed(2).replace('.', ',')}` : '—')

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0f1a] border border-[#1e2235] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : !game ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">Game not found</p>
          </div>
        ) : (
          <>
            {/* Header with Close Button */}
            <div className="sticky top-0 bg-[#0d0f1a] border-b border-[#1e2235] p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-white">Quick View</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#1a1d2e] rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Game Image & Basic Info */}
              <div className="flex flex-col md:flex-row gap-6">
                <img
                  src={game.header_image || ''}
                  alt={game.name}
                  className="w-full md:w-96 rounded-lg"
                />
                <div className="flex-1 space-y-4">
                  <h3 className="text-2xl font-bold text-white">{game.name}</h3>

                  {/* Price */}
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Best Price</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-400">
                        {fmt(game.best_price)}
                      </span>
                      {game.best_store && (
                        <span className="text-sm text-gray-500">via {game.best_store}</span>
                      )}
                    </div>
                  </div>

                  {/* Scores Row */}
                  <div className="flex flex-wrap gap-4">
                    {game.metacritic_score && (
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-yellow-400" />
                        <div>
                          <p className="text-xs text-gray-400">Metacritic</p>
                          <p className="text-lg font-bold text-yellow-400">{game.metacritic_score}</p>
                        </div>
                      </div>
                    )}
                    {game.steam_review_score && (
                      <div className="flex items-center gap-2">
                        <Star size={18} className="text-blue-400" />
                        <div>
                          <p className="text-xs text-gray-400">Steam Reviews</p>
                          <p className="text-lg font-bold text-blue-400">{game.steam_review_score}%</p>
                        </div>
                      </div>
                    )}
                    {game.player_count_current && (
                      <div className="flex items-center gap-2">
                        <Users size={18} className="text-purple-400" />
                        <div>
                          <p className="text-xs text-gray-400">Players Now</p>
                          <p className="text-lg font-bold text-purple-400">
                            {game.player_count_current.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {game.short_description && (
                    <div>
                      <p className="text-sm text-gray-300 line-clamp-3">
                        {game.short_description}
                      </p>
                    </div>
                  )}

                  {/* Genres */}
                  {game.genres && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Genres</p>
                      <p className="text-sm text-gray-300">{game.genres}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Store Prices */}
              {game.prices && game.prices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Available at:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {game.prices.slice(0, 6).map((price, idx) => (
                      <div
                        key={idx}
                        className="bg-[#111320] border border-[#1e2235] rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{price.store_name}</p>
                          {price.is_on_sale && price.discount_percent > 0 && (
                            <p className="text-xs text-green-400">-{price.discount_percent}% off</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-400">
                            {price.sale_price != null ? fmt(price.sale_price) : fmt(price.regular_price)}
                          </p>
                          {price.is_on_sale && price.regular_price && (
                            <p className="text-xs text-gray-500 line-through">
                              {fmt(price.regular_price)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historic Low */}
              {game.historic_low_price && (
                <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4 flex items-center gap-3">
                  <TrendingUp size={24} className="text-blue-400" />
                  <div>
                    <p className="text-sm text-blue-400 font-semibold">Historic Low</p>
                    <p className="text-lg font-bold text-white">
                      {fmt(game.historic_low_price)}
                      {game.historic_low_date && (
                        <span className="text-sm text-gray-400 ml-2">
                          on {new Date(game.historic_low_date).toLocaleDateString('nl-NL')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/game/${game.steam_appid}`}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  <ExternalLink size={18} />
                  <span>View Full Details</span>
                </Link>
                <button className="flex items-center gap-2 px-6 py-3 bg-[#111320] border border-[#1e2235] hover:border-purple-500 text-white rounded-lg font-medium transition-colors">
                  <Heart size={18} />
                  <span>Add to Wishlist</span>
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-[#111320] border border-[#1e2235] hover:border-purple-500 text-white rounded-lg font-medium transition-colors">
                  <Bell size={18} />
                  <span>Set Alert</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
