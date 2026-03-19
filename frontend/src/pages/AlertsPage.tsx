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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <Bell size={28} className="text-yellow-400" />
        Price Alerts
      </h1>
      <p className="text-slate-400 mb-8">
        {active.length} active alert{active.length !== 1 ? 's' : ''}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#13151f] rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Bell size={48} className="mx-auto mb-4 opacity-30" />
          <p className="mb-4">No price alerts set yet.</p>
          <Link to="/" className="text-purple-400 hover:text-purple-300">Browse games to set alerts →</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active alerts */}
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Active</h2>
              <div className="space-y-3">
                {active.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onDelete={() => deleteMutation.mutate(alert.id)}
                    onToggle={() => toggleMutation.mutate(alert.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Triggered alerts */}
          {triggered.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-green-400" /> Triggered
              </h2>
              <div className="space-y-3 opacity-60">
                {triggered.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onDelete={() => deleteMutation.mutate(alert.id)}
                    onToggle={() => toggleMutation.mutate(alert.id)}
                  />
                ))}
              </div>
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
  const currentBest = alert.game.best_price
  const willTrigger = currentBest != null && currentBest <= alert.target_price

  return (
    <div className={`flex items-center gap-4 p-4 bg-[#13151f] border rounded-xl transition-colors ${
      alert.triggered_at
        ? 'border-green-700/30'
        : willTrigger
        ? 'border-yellow-600/50'
        : 'border-[#1e2235]'
    }`}>
      <Link to={`/game/${alert.game.steam_appid}`}>
        <img
          src={alert.game.header_image || ''}
          alt={alert.game.name}
          className="w-20 h-12 object-cover rounded-lg"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/game/${alert.game.steam_appid}`}
          className="text-sm font-medium text-white hover:text-purple-300 transition-colors line-clamp-1"
        >
          {alert.game.name}
        </Link>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
          <span>
            Target: <span className="text-yellow-400 font-medium">${alert.target_price.toFixed(2)}</span>
          </span>
          <span>
            Current best:{' '}
            <span className={currentBest != null && currentBest <= alert.target_price ? 'text-green-400 font-medium' : 'text-white'}>
              {currentBest != null ? `$${currentBest.toFixed(2)}` : '—'}
            </span>
          </span>
          {alert.triggered_at && (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle size={10} /> Triggered {new Date(alert.triggered_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg transition-colors ${
            alert.is_active
              ? 'text-yellow-400 hover:bg-yellow-900/20'
              : 'text-slate-500 hover:bg-[#1e2235]'
          }`}
          title={alert.is_active ? 'Pause alert' : 'Resume alert'}
        >
          {alert.is_active ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete alert"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
