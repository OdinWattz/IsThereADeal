import { type MouseEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { Clock, X, Heart } from 'lucide-react'
import { OptimizedImage } from './OptimizedImage'
import { addToWishlist, getWishlist, removeFromWishlist } from '../api/games'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export function RecentlyViewed() {
  const { recentlyViewed, clearRecentlyViewed, removeFromRecentlyViewed } = useRecentlyViewed()
  const { isAuthenticated } = useAuthStore()
  const authenticated = isAuthenticated()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [pendingWishlistAppids, setPendingWishlistAppids] = useState<Set<string>>(new Set())

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => getWishlist(),
    enabled: authenticated,
    staleTime: 1000 * 60,
  })

  const wishlistByAppid = new Map(
    wishlistItems.map((item) => [item.game.steam_appid, item.id] as const)
  )

  const toggleWishlistMutation = useMutation({
    mutationFn: async (steamAppid: string) => {
      const wishlistId = wishlistByAppid.get(steamAppid)
      if (wishlistId) {
        await removeFromWishlist(wishlistId)
        return { action: 'removed' as const }
      }
      await addToWishlist(steamAppid)
      return { action: 'added' as const }
    },
    onMutate: (steamAppid: string) => {
      setPendingWishlistAppids((prev) => new Set(prev).add(steamAppid))
    },
    onSuccess: (result) => {
      toast.success(result.action === 'added' ? 'Toegevoegd aan verlanglijst!' : 'Verwijderd van verlanglijst')
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? 'Wishlist actie mislukt')
    },
    onSettled: (_data, _error, steamAppid) => {
      setPendingWishlistAppids((prev) => {
        const next = new Set(prev)
        next.delete(steamAppid)
        return next
      })
    },
  })

  const handleWishlistClick = (event: MouseEvent<HTMLButtonElement>, steamAppid: string) => {
    event.preventDefault()
    event.stopPropagation()

    if (!authenticated) {
      toast('Log in om games aan je verlanglijst toe te voegen')
      navigate('/login')
      return
    }

    if (pendingWishlistAppids.has(steamAppid)) {
      return
    }

    toggleWishlistMutation.mutate(steamAppid)
  }

  const handleRemoveRecentClick = (event: MouseEvent<HTMLButtonElement>, steamAppid: string) => {
    event.preventDefault()
    event.stopPropagation()
    removeFromRecentlyViewed(steamAppid)
  }

  if (recentlyViewed.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Clock size={20} style={{ color: 'var(--accent)' }} />
          Recent bekeken
        </h2>
        <button
          onClick={clearRecentlyViewed}
          className="text-sm flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <X size={14} />
          Wissen
        </button>
      </div>

      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recentlyViewed.map((game) => (
            <Link
              key={game.steam_appid}
              to={`/game/${game.steam_appid}`}
              className="group flex-shrink-0 w-48 rounded-lg overflow-hidden transition-all"
              style={{
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(110, 190, 235, 0.42)',
                boxShadow: '0 2px 10px rgba(40, 110, 165, 0.08)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1278a8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(18, 120, 168, 0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110, 190, 235, 0.42)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(40, 110, 165, 0.08)' }}
            >
              <div className="relative">
                <button
                  type="button"
                  aria-label={`Verwijder ${game.name} uit recent bekeken`}
                  title="Verwijder uit recent bekeken"
                  onClick={(event) => handleRemoveRecentClick(event, game.steam_appid)}
                  className="absolute top-2 left-2 z-20 rounded-full p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-all duration-150"
                  style={{
                    background: 'rgba(8, 32, 48, 0.65)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
                    outline: 'none',
                  }}
                >
                  <X size={14} color="#ffffff" />
                </button>
                <button
                  type="button"
                  aria-label={wishlistByAppid.has(game.steam_appid) ? `Verwijder ${game.name} uit verlanglijst` : `Voeg ${game.name} toe aan verlanglijst`}
                  title={wishlistByAppid.has(game.steam_appid) ? 'Verwijder van verlanglijst' : 'Voeg toe aan verlanglijst'}
                  onClick={(event) => handleWishlistClick(event, game.steam_appid)}
                  disabled={pendingWishlistAppids.has(game.steam_appid)}
                  className={`wishlist-heart-btn absolute top-2 right-2 z-20 rounded-full p-2 ${wishlistByAppid.has(game.steam_appid) ? 'opacity-100 is-active' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'} ${pendingWishlistAppids.has(game.steam_appid) ? 'cursor-not-allowed is-busy' : ''}`}
                  style={{
                    background: wishlistByAppid.has(game.steam_appid) ? 'rgba(232, 121, 160, 0.9)' : 'rgba(8, 32, 48, 0.65)',
                    backdropFilter: 'blur(4px)',
                    border: wishlistByAppid.has(game.steam_appid) ? '1px solid rgba(232,121,160,0.95)' : '1px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
                    outline: 'none',
                  }}
                >
                  <Heart
                    className="wishlist-heart-icon"
                    size={14}
                    color="#ffffff"
                    fill={wishlistByAppid.has(game.steam_appid) ? '#ffffff' : 'transparent'}
                  />
                </button>
                <OptimizedImage
                  src={game.header_image}
                  alt={game.name}
                  className="w-full aspect-[460/215] object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <h3 className="text-xs font-medium line-clamp-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
                  {game.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
