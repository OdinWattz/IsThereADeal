import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWishlist, removeFromWishlist, updateTargetPrice } from '../api/games'
import { useAuthStore } from '../store/authStore'
import { Navigate, Link } from 'react-router-dom'
import { Heart, Trash2, Target } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function WishlistPage() {
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState('')

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeFromWishlist(id),
    onSuccess: () => { toast.success('Removed from wishlist'); qc.invalidateQueries({ queryKey: ['wishlist'] }) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) => updateTargetPrice(id, price),
    onSuccess: () => {
      toast.success('Target price updated!')
      setEditingId(null)
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })

  const saleItems = items.filter((item) => {
    const best = item.game.best_price
    const target = item.target_price
    return best != null && target != null && best <= target
  })

  const fmt = (v?: number | null) => v != null ? `€${v.toFixed(2).replace('.', ',')}` : '—'

  const rowStyle = (highlight: boolean): React.CSSProperties => ({
    display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px',
    backgroundColor: highlight ? 'rgba(22,163,74,0.07)' : '#111320',
    border: `1px solid ${highlight ? 'rgba(22,163,74,0.35)' : '#1e2235'}`,
    borderRadius: '12px',
    marginBottom: '12px',
  })

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Heart size={28} color="#f472b6" /> Verlanglijst
      </h1>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>{items.length} game{items.length !== 1 ? 's' : ''} bijgehouden</p>

      {saleItems.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '12px' }}>
          <p style={{ color: '#4ade80', fontWeight: 600, marginBottom: '10px' }}>
            🎉 {saleItems.length} game{saleItems.length !== 1 ? 's zijn' : ' is'} op of onder je doelprijs!
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {saleItems.map((item) => (
              <Link key={item.id} to={`/game/${item.game.steam_appid}`}
                style={{ fontSize: '0.8rem', color: '#86efac', backgroundColor: 'rgba(22,163,74,0.2)', padding: '4px 12px', borderRadius: '20px', textDecoration: 'none' }}>
                {item.game.name} — {fmt(item.game.best_price)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div>{Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: '100px', backgroundColor: '#111320', borderRadius: '12px', marginBottom: '12px' }} />)}</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <Heart size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ marginBottom: '12px' }}>Je verlanglijst is leeg.</p>
          <Link to="/" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '0.9rem' }}>Deals bekijken →</Link>
        </div>
      ) : (
        <div>
          {items.map((item) => {
            const onSale = item.target_price != null && item.game.best_price != null && item.game.best_price <= item.target_price
            return (
              <div key={item.id} style={rowStyle(onSale)}>
                <Link to={`/game/${item.game.steam_appid}`}>
                  <img src={item.game.header_image || ''} alt={item.game.name}
                    style={{ width: '180px', height: '100px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                </Link>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <Link to={`/game/${item.game.steam_appid}`}
                    style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                    {item.game.name}
                  </Link>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>
                      Beste prijs: <span style={{ color: onSale ? '#4ade80' : '#fff', fontWeight: 600 }}>{fmt(item.game.best_price)}</span>
                      {item.game.best_store && <span style={{ color: '#475569' }}> via {item.game.best_store}</span>}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                      <Target size={13} color="#facc15" /> Doel:{' '}
                      {editingId === item.id ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                            style={{ width: '72px', backgroundColor: '#1e2235', border: '1px solid #2a2d3e', borderRadius: '6px', padding: '3px 8px', color: '#fff', fontSize: '0.8rem', outline: 'none' }} />
                          <button onClick={() => updateMutation.mutate({ id: item.id, price: parseFloat(editPrice) })}
                            style={{ color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Opslaan</button>
                          <button onClick={() => setEditingId(null)}
                            style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Annuleer</button>
                        </span>
                      ) : (
                        <button onClick={() => { setEditingId(item.id); setEditPrice(item.target_price?.toString() ?? '') }}
                          style={{ color: '#facc15', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                          {item.target_price != null ? fmt(item.target_price) : 'Instellen'}
                        </button>
                      )}
                    </span>
                  </div>

                  {onSale && <p style={{ marginTop: '8px', fontSize: '0.75rem', color: '#4ade80', fontWeight: 500 }}>✅ Prijs is op of onder je doel!</p>}
                  <p style={{ fontSize: '0.72rem', color: '#334155', marginTop: '4px' }}>Toegevoegd op {new Date(item.added_at).toLocaleDateString('nl-NL')}</p>
                </div>

                <button onClick={() => removeMutation.mutate(item.id)}
                  style={{ alignSelf: 'flex-start', padding: '8px', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                  title="Verwijderen">
                  <Trash2 size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
