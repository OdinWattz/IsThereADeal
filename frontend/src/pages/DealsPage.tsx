import { useQuery } from '@tanstack/react-query'
import { getDeals } from '../api/games'
import { GameCard } from '../components/GameCard'
import { useState } from 'react'
import { TrendingDown } from 'lucide-react'

export function DealsPage() {
  const [page, setPage] = useState(0)
  const limit = 20

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', page],
    queryFn: () => getDeals(page * limit, limit),
    staleTime: 1000 * 60 * 5,
  })

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  }

  const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    backgroundColor: '#111320',
    border: `1px solid ${disabled ? '#1e2235' : '#2a2d3e'}`,
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: disabled ? '#334155' : '#cbd5e1',
    cursor: disabled ? 'not-allowed' : 'pointer',
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TrendingDown size={28} color="#4ade80" /> Deals
      </h1>
      <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '0.9rem' }}>Games die nu in de aanbieding zijn bij bijgehouden winkels</p>

      {isLoading ? (
        <div style={gridStyle}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: '#111320', borderRadius: '12px', height: '200px' }} />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <TrendingDown size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p>Nog geen deals. Zoek een game om prijzen te volgen.</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {deals.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={pageBtnStyle(page === 0)}>
          ← Vorige
        </button>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Pagina {page + 1}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={deals.length < limit} style={pageBtnStyle(deals.length < limit)}>
          Volgende →
        </button>
      </div>
    </div>
  )
}
