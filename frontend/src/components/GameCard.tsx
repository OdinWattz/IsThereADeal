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
        backgroundColor: '#0a0a0a',
        border: '1px solid #222222',
        borderRadius: '12px',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = '#7c3aed'
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 8px 24px rgba(124,58,237,0.15)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = '#222222'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
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
            backgroundColor: '#16a34a', color: '#fff',
            fontSize: '0.7rem', fontWeight: 700,
            padding: '3px 7px', borderRadius: '6px',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            <TrendingDown size={10} /> -{discount}%
          </div>
        )}
        {game.best_store && game.best_store !== 'Steam' && showBestDeal && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            backgroundColor: 'rgba(124,58,237,0.9)', color: '#fff',
            fontSize: '0.7rem', padding: '3px 7px', borderRadius: '6px',
          }}>
            {game.best_store}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <h3 style={{
          fontSize: '0.85rem', fontWeight: 500, color: '#e2e8f0',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          marginBottom: '8px', lineHeight: '1.4',
        }}>
          {game.name}
        </h3>

        <div>
          {displayPrice !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80' }}>
                €{displayPrice.toFixed(2).replace('.', ',')}
              </span>
              {regularPrice && regularPrice > displayPrice && (
                <span style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'line-through' }}>
                  €{regularPrice.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Free / N/A</span>
          )}
          <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
            {game.prices.length} store{game.prices.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}
