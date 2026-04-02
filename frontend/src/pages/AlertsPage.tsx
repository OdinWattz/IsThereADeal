import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, deleteAlert, toggleAlert } from '../api/games'
import { useAuthStore } from '../store/authStore'
import { Navigate, Link } from 'react-router-dom'
import { Bell, BellOff, Trash2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export function AlertsPage() {
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAlert(id),
    onSuccess: () => { toast.success('Alert deleted'); qc.invalidateQueries({ queryKey: ['alerts'] }) },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const active = alerts.filter((a) => a.is_active)
  const triggered = alerts.filter((a) => !a.is_active && a.triggered_at)

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Bell size={28} color="#facc15" /> Prijsalerts
      </h1>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>
        {active.length} actieve alert{active.length !== 1 ? 's' : ''}
      </p>

      {isLoading ? (
        <div>{Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: '76px', backgroundColor: '#0a0a0a', borderRadius: '12px', marginBottom: '10px' }} />)}</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <Bell size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ marginBottom: '12px' }}>Nog geen prijsalerts.</p>
          <Link to="/" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '0.9rem' }}>Games zoeken om alerts in te stellen →</Link>
        </div>
      ) : (
        <div>
          {active.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Actief</p>
              {active.map((alert) => (
                <AlertRow key={alert.id} alert={alert}
                  onDelete={() => deleteMutation.mutate(alert.id)}
                  onToggle={() => toggleMutation.mutate(alert.id)} />
              ))}
            </div>
          )}
          {triggered.length > 0 && (
            <div style={{ opacity: 0.65 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={13} color="#4ade80" /> Getriggerd
              </p>
              {triggered.map((alert) => (
                <AlertRow key={alert.id} alert={alert}
                  onDelete={() => deleteMutation.mutate(alert.id)}
                  onToggle={() => toggleMutation.mutate(alert.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AlertRow({ alert, onDelete, onToggle }: {
  alert: any
  onDelete: () => void
  onToggle: () => void
}) {
  const fmt = (v?: number | null) => v != null ? `€${v.toFixed(2).replace('.', ',')}` : '—'
  const currentBest = alert.game.best_price
  const willTrigger = currentBest != null && currentBest <= alert.target_price
  const borderColor = alert.triggered_at ? 'rgba(22,163,74,0.3)' : willTrigger ? 'rgba(234,179,8,0.4)' : '#222222'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', backgroundColor: '#0a0a0a', border: `1px solid ${borderColor}`, borderRadius: '12px', marginBottom: '10px' }}>
      <Link to={`/game/${alert.game.steam_appid}`}>
        <img src={alert.game.header_image || ''} alt={alert.game.name}
          style={{ width: '80px', height: '48px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/game/${alert.game.steam_appid}`}
          style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff', textDecoration: 'none', display: 'block', marginBottom: '4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {alert.game.name}
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
          <span>Doel: <span style={{ color: '#facc15', fontWeight: 600 }}>{fmt(alert.target_price)}</span></span>
          <span>Huidig: <span style={{ color: willTrigger ? '#4ade80' : '#fff', fontWeight: 600 }}>{fmt(currentBest)}</span></span>
          {alert.triggered_at && (
            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={10} /> Getriggerd op {new Date(alert.triggered_at).toLocaleDateString('nl-NL')}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={onToggle} title={alert.is_active ? 'Pauzeer' : 'Hervatten'}
          style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: alert.is_active ? '#facc15' : '#475569', borderRadius: '8px' }}>
          {alert.is_active ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
        <button onClick={onDelete} title="Verwijderen"
          style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', borderRadius: '8px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
