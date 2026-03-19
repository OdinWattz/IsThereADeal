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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <Heart size={28} className="text-pink-400" />
        My Wishlist
      </h1>
      <p className="text-slate-400 mb-8">{items.length} game{items.length !== 1 ? 's' : ''} tracked</p>

      {/* Alert: items on sale matching target price */}
      {saleItems.length > 0 && (
        <div className="mb-8 p-4 bg-green-900/20 border border-green-700/40 rounded-xl">
          <p className="text-green-400 font-semibold mb-3 flex items-center gap-2">
            🎉 {saleItems.length} game{saleItems.length !== 1 ? 's are' : ' is'} at or below your target price!
          </p>
          <div className="flex flex-wrap gap-2">
            {saleItems.map((item) => (
              <Link
                key={item.id}
                to={`/game/${item.game.steam_appid}`}
                className="text-sm text-green-300 hover:text-white bg-green-900/40 px-3 py-1 rounded-full transition-colors"
              >
                {item.game.name} — ${item.game.best_price?.toFixed(2)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#13151f] rounded-xl h-28 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Heart size={48} className="mx-auto mb-4 opacity-30" />
          <p className="mb-4">Your wishlist is empty.</p>
          <Link to="/" className="text-purple-400 hover:text-purple-300">Browse deals →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const onSale = item.target_price != null &&
              item.game.best_price != null &&
              item.game.best_price <= item.target_price

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row gap-4 p-4 bg-[#13151f] border rounded-xl transition-colors ${
                  onSale ? 'border-green-600/50 bg-green-900/10' : 'border-[#1e2235]'
                }`}
              >
                {/* Game thumbnail */}
                <Link to={`/game/${item.game.steam_appid}`}>
                  <img
                    src={item.game.header_image || ''}
                    alt={item.game.name}
                    className="w-full sm:w-48 h-28 object-cover rounded-lg"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/game/${item.game.steam_appid}`}
                    className="text-lg font-semibold text-white hover:text-purple-300 transition-colors line-clamp-1"
                  >
                    {item.game.name}
                  </Link>

                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-slate-500">Best price: </span>
                      <span className={`font-bold ${onSale ? 'text-green-400' : 'text-white'}`}>
                        {item.game.best_price != null ? `$${item.game.best_price.toFixed(2)}` : '—'}
                      </span>
                      {item.game.best_store && (
                        <span className="text-slate-500 ml-1">on {item.game.best_store}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-yellow-400" />
                      <span className="text-slate-500">Target: </span>
                      {editingId === item.id ? (
                        <span className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-20 bg-[#1e2235] border border-[#2a2d3e] rounded px-2 py-0.5 text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                          <button
                            onClick={() => updateMutation.mutate({ id: item.id, price: parseFloat(editPrice) })}
                            className="text-xs text-green-400 hover:text-green-300"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-slate-500">Cancel</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setEditingId(item.id); setEditPrice(item.target_price?.toString() ?? '') }}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          {item.target_price != null ? `$${item.target_price.toFixed(2)}` : 'Set target'}
                        </button>
                      )}
                    </div>
                  </div>

                  {onSale && (
                    <p className="mt-2 text-xs text-green-400 font-medium">
                      ✅ Price is at or below your target!
                    </p>
                  )}

                  <p className="text-xs text-slate-600 mt-1">
                    Added {new Date(item.added_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  className="self-start p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remove from wishlist"
                >
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
