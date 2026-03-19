import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGame, getPriceHistory, addToWishlist, createAlert } from '../api/games'
import { PriceTable } from '../components/PriceTable'
import { PriceHistoryChart } from '../components/PriceHistoryChart'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Heart, Bell, RefreshCw, ExternalLink, Calendar, Cpu, Tag, ChevronLeft,
} from 'lucide-react'

export function GamePage() {
  const { appid } = useParams<{ appid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [alertPrice, setAlertPrice] = useState('')
  const [showAlertForm, setShowAlertForm] = useState(false)

  const { data: game, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['game', appid],
    queryFn: () => getGame(appid!),
    enabled: !!appid,
    staleTime: 1000 * 60 * 5,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['history', appid],
    queryFn: () => getPriceHistory(appid!),
    enabled: !!appid,
    staleTime: 1000 * 60 * 30,
  })

  const wishlistMutation = useMutation({
    mutationFn: () => addToWishlist(game!.id),
    onSuccess: () => { toast.success('Added to wishlist!'); qc.invalidateQueries({ queryKey: ['wishlist'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed to add'),
  })

  const alertMutation = useMutation({
    mutationFn: (price: number) => createAlert(game!.id, price),
    onSuccess: () => {
      toast.success('Price alert set!')
      setShowAlertForm(false)
      setAlertPrice('')
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed to set alert'),
  })

  const handleRefresh = async () => {
    await getGame(appid!, true)
    refetch()
    toast.success('Prices refreshed!')
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-[#13151f] rounded-xl" />
          <div className="h-8 bg-[#13151f] rounded w-1/2" />
          <div className="h-48 bg-[#13151f] rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-red-400 mb-4">Game not found or failed to load.</p>
        <button onClick={() => navigate(-1)} className="text-purple-400 hover:text-purple-300">
          ← Go back
        </button>
      </div>
    )
  }

  const steamPrice = game.prices.find((p) => p.store_name === 'Steam')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* Hero */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <img
          src={game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`}
          alt={game.name}
          className="w-full md:w-80 rounded-xl object-cover"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">{game.name}</h1>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
            {game.release_date && (
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {game.release_date}
              </span>
            )}
            {game.developers && (
              <span className="flex items-center gap-1">
                <Cpu size={14} /> {game.developers}
              </span>
            )}
            {game.genres && (
              <span className="flex items-center gap-1">
                <Tag size={14} /> {game.genres}
              </span>
            )}
          </div>

          {game.short_description && (
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">{game.short_description}</p>
          )}

          {/* Best price highlight */}
          {game.best_price != null && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 mb-4 inline-block">
              <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Best price</p>
              <p className="text-3xl font-bold text-green-400">${game.best_price.toFixed(2)}</p>
              {game.best_store && <p className="text-sm text-slate-400 mt-1">on {game.best_store}</p>}
              {steamPrice?.regular_price && game.best_price < steamPrice.regular_price && (
                <p className="text-xs text-slate-500 mt-1 line-through">
                  Steam: ${steamPrice.regular_price.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {game.steam_url && (
              <a
                href={game.steam_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#1b2838] hover:bg-[#2a475e] text-white rounded-lg text-sm transition-colors"
              >
                <ExternalLink size={14} /> Steam Store
              </a>
            )}

            {isAuthenticated() && (
              <>
                <button
                  onClick={() => wishlistMutation.mutate()}
                  disabled={wishlistMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Heart size={14} /> Add to Wishlist
                </button>

                <button
                  onClick={() => setShowAlertForm(!showAlertForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm transition-colors"
                >
                  <Bell size={14} /> Set Alert
                </button>
              </>
            )}

            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e2235] hover:bg-[#252840] text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Refresh prices
            </button>
          </div>

          {/* Alert price form */}
          {showAlertForm && (
            <div className="mt-4 flex items-center gap-3 p-4 bg-[#13151f] border border-[#1e2235] rounded-xl">
              <span className="text-sm text-slate-300">Alert me when price drops below</span>
              <div className="flex items-center gap-1 bg-[#1e2235] border border-[#2a2d3e] rounded-lg px-3 py-2">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  className="w-20 bg-transparent text-white text-sm focus:outline-none"
                  placeholder="9.99"
                />
              </div>
              <button
                onClick={() => alertMutation.mutate(parseFloat(alertPrice))}
                disabled={!alertPrice || alertMutation.isPending}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Set Alert
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Price Table */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          All Prices ({game.prices.length} stores)
        </h2>
        <PriceTable prices={game.prices} />
      </section>

      {/* Price History */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Price History</h2>
        <div className="bg-[#13151f] border border-[#1e2235] rounded-xl p-6">
          <PriceHistoryChart history={history} />
        </div>
      </section>
    </div>
  )
}
