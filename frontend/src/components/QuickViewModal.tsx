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
        className="rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ background: 'rgba(235,250,255,0.97)', border: '1px solid rgba(90,175,225,0.5)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(40,100,160,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#1480b8' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          </div>
        ) : !game ? (
          <div className="p-8 text-center">
            <p style={{ color: 'var(--text-secondary)' }}>Game not found</p>
          </div>
        ) : (
          <>
            {/* Header with Close Button */}
            <div className="sticky top-0 p-4 flex items-center justify-between z-10" style={{ background: 'rgba(220,244,255,0.96)', borderBottom: '1px solid rgba(90,175,225,0.4)', backdropFilter: 'blur(12px)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Quick View</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(90,175,225,0.2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <X size={20} />
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
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{game.name}</h3>

                  {/* Price */}
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Best Price</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold" style={{ color: 'var(--green)' }}>
                        {fmt(game.best_price)}
                      </span>
                      {game.best_store && (
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>via {game.best_store}</span>
                      )}
                    </div>
                  </div>

                  {/* Scores Row */}
                  <div className="flex flex-wrap gap-4">
                    {game.metacritic_score && (
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-yellow-400" />
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Metacritic</p>
                          <p className="text-lg font-bold text-yellow-400">{game.metacritic_score}</p>
                        </div>
                      </div>
                    )}
                    {game.steam_review_score && (
                      <div className="flex items-center gap-2">
                        <Star size={18} style={{ color: '#1480b8' }} />
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Steam Reviews</p>
                          <p className="text-lg font-bold" style={{ color: '#1480b8' }}>{game.steam_review_score}%</p>
                        </div>
                      </div>
                    )}
                    {game.player_count_current && (
                      <div className="flex items-center gap-2">
                        <Users size={18} style={{ color: 'var(--accent)' }} />
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Players Now</p>
                          <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                            {game.player_count_current.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {game.short_description && (
                    <div>
                      <p className="text-sm line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                        {game.short_description}
                      </p>
                    </div>
                  )}

                  {/* Genres */}
                  {game.genres && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Genres</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{game.genres}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Store Prices */}
              {game.prices && game.prices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Available at:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {game.prices.slice(0, 6).map((price, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg p-3 flex items-center justify-between"
                        style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(110,190,235,0.42)', backdropFilter: 'blur(6px)' }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{price.store_name}</p>
                          {price.is_on_sale && price.discount_percent > 0 && (
                            <p className="text-xs" style={{ color: 'var(--green)' }}>-{price.discount_percent}% off</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color: 'var(--green)' }}>
                            {price.sale_price != null ? fmt(price.sale_price) : fmt(price.regular_price)}
                          </p>
                          {price.is_on_sale && price.regular_price && (
                            <p className="text-xs line-through" style={{ color: 'var(--text-tertiary)' }}>
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
                <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: 'rgba(220,244,255,0.8)', border: '1px solid rgba(90,175,225,0.5)' }}>
                  <TrendingUp size={24} style={{ color: '#1480b8' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1480b8' }}>Historic Low</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {fmt(game.historic_low_price)}
                      {game.historic_low_date && (
                        <span className="text-sm ml-2" style={{ color: 'var(--text-tertiary)' }}>
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
                  className="btn-aero flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
                >
                  <ExternalLink size={18} />
                  <span>View Full Details</span>
                </Link>
                <button
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(110,190,235,0.42)', color: 'var(--text-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1480b8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,190,235,0.42)' }}
                >
                  <Heart size={18} />
                  <span>Add to Wishlist</span>
                </button>
                <button
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(110,190,235,0.42)', color: 'var(--text-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1480b8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,190,235,0.42)' }}
                >
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
