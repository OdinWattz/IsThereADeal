import { Link } from 'react-router-dom'
import type { Game } from '../api/games'
import { TrendingDown } from 'lucide-react'

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
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.84)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(110, 190, 235, 0.45)',
        borderRadius: '12px',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 3px 14px rgba(40, 110, 165, 0.1)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = '#1278a8'
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 8px 24px rgba(18, 120, 168, 0.22)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(110, 190, 235, 0.45)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = '0 3px 14px rgba(40, 110, 165, 0.1)'
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`}
          alt={game.name}
          style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
        />
        {discount > 0 && (
          <div style={{
            position: 'absolute', top: '8px', left: '8px',
            background: 'linear-gradient(135deg, #1ea866, #16a560)',
            color: '#fff',
            fontSize: '0.7rem', fontWeight: 700,
            padding: '3px 7px', borderRadius: '6px',
            display: 'flex', alignItems: 'center', gap: '3px',
            boxShadow: '0 2px 6px rgba(22, 165, 88, 0.35)',
          }}>
            <TrendingDown size={10} /> -{discount}%
          </div>
        )}
        {game.best_store && game.best_store !== 'Steam' && showBestDeal && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'rgba(18, 120, 168, 0.88)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            fontSize: '0.7rem', padding: '3px 7px', borderRadius: '6px',
          }}>
            {game.best_store}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <h3 style={{
          fontSize: '0.85rem', fontWeight: 500, color: '#082030',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          marginBottom: '8px', lineHeight: '1.4',
        }}>
          {game.name}
        </h3>

        <div>
          {displayPrice !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#169a58' }}>
                €{displayPrice.toFixed(2).replace('.', ',')}
              </span>
              {regularPrice && regularPrice > displayPrice && (
                <span style={{ fontSize: '0.75rem', color: '#7aabcc', textDecoration: 'line-through' }}>
                  €{regularPrice.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#5888a5' }}>Free / N/A</span>
          )}
          <p style={{ fontSize: '0.72rem', color: '#78a8c5', marginTop: '2px' }}>
            {game.prices.length} store{game.prices.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}
