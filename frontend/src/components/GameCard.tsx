import { Link } from 'react-router-dom'
import type { Game } from '../api/games'
import { TrendingDown, ExternalLink } from 'lucide-react'

interface Props {
  game: Game
  showBestDeal?: boolean
}

export function GameCard({ game, showBestDeal = true }: Props) {
  const steamPrice = game.prices.find((p) => p.store_id === 'steam' || p.store_name === 'Steam')
  const displayPrice = game.best_price ?? steamPrice?.sale_price ?? steamPrice?.regular_price
  const regularPrice = steamPrice?.regular_price
  const discount = steamPrice?.discount_percent ?? 0

  return (
    <Link
      to={`/game/${game.steam_appid}`}
      className="group bg-[#13151f] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-900/20 transition-all duration-200"
    >
      {/* Header image */}
      <div className="relative overflow-hidden">
        <img
          src={game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
          alt={game.name}
          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
            <TrendingDown size={12} />
            -{discount}%
          </div>
        )}
        {game.best_store && game.best_store !== 'Steam' && showBestDeal && (
          <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs px-2 py-1 rounded-md">
            {game.best_store}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-slate-200 line-clamp-2 mb-2 group-hover:text-purple-300 transition-colors">
          {game.name}
        </h3>

        <div className="flex items-end justify-between">
          <div>
            {displayPrice !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-green-400">
                  ${displayPrice.toFixed(2)}
                </span>
                {regularPrice && regularPrice > (displayPrice ?? 0) && (
                  <span className="text-xs text-slate-500 line-through">
                    ${regularPrice.toFixed(2)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500">Free / N/A</span>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              {game.prices.length} store{game.prices.length !== 1 ? 's' : ''}
            </p>
          </div>
          <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  )
}
