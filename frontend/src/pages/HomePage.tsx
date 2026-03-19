import { useQuery } from '@tanstack/react-query'
import { getFeaturedDeals, getDeals } from '../api/games'
import { GameCard } from '../components/GameCard'
import { TrendingDown, Zap, BarChart2 } from 'lucide-react'

export function HomePage() {
  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeaturedDeals,
    staleTime: 1000 * 60 * 15,
  })

  const { data: dbDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => getDeals(0, 12),
    staleTime: 1000 * 60 * 10,
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px', width: '100%' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, color: '#fff', marginBottom: '12px', lineHeight: 1.1 }}>
          Find the{' '}
          <span style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            best game deals
          </span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto 32px' }}>
          Compare prices across Steam, GOG, Humble, Fanatical, key resellers and more.
          Set price alerts and never miss a sale.
        </p>
        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
          {[
            { icon: <TrendingDown size={15} />, label: '30+ stores compared' },
            { icon: <Zap size={15} />, label: 'Live price alerts' },
            { icon: <BarChart2 size={15} />, label: 'Price history charts' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#111320', border: '1px solid #1e2235', padding: '8px 16px', borderRadius: '999px', fontSize: '0.85rem', color: '#94a3b8' }}>
              <span style={{ color: '#a78bfa' }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Steam Featured Deals */}
      <section style={{ marginBottom: '56px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingDown size={20} style={{ color: '#4ade80' }} />
          Steam Featured Deals
        </h2>
        {featuredLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ backgroundColor: '#111320', borderRadius: '12px', height: '220px', animation: 'pulse 2s infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {featured.slice(0, 10).map((game) => (
              <a
                key={game.steam_appid}
                href={`/game/${game.steam_appid}`}
                style={{ display: 'block', backgroundColor: '#111320', border: '1px solid #1e2235', borderRadius: '12px', overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2235'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={game.header_image} alt={game.name} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                  {game.discount_percent > 0 && (
                    <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#16a34a', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                      -{game.discount_percent}%
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px' }}>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {game.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1rem' }}>
                      €{(game.sale_price ?? game.regular_price ?? 0).toFixed(2).replace('.', ',')}
                    </span>
                    {game.regular_price > (game.sale_price ?? game.regular_price) && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'line-through' }}>
                        €{game.regular_price.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* DB Tracked Deals */}
      {dbDeals.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} style={{ color: '#a78bfa' }} />
            Tracked Deals (All Stores)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {dealsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ backgroundColor: '#111320', borderRadius: '12px', height: '220px' }} />
                ))
              : dbDeals.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        </section>
      )}
    </div>
  )
}
