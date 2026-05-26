import { type MouseEvent, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addToWishlist, getWishlist, removeFromWishlist, searchGames } from '../api/games'
import { Search, Heart } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const { isAuthenticated } = useAuthStore()
  const authenticated = isAuthenticated()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [pendingWishlistAppids, setPendingWishlistAppids] = useState<Set<string>>(new Set())

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchGames(q),
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 5,
  })

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
        <Search size={22} style={{ color: 'var(--accent)' }} />
        Zoekresultaten voor &ldquo;{q}&rdquo;
      </h1>
      <p className="text-sm sm:text-base mb-6 sm:mb-7" style={{ color: 'var(--text-secondary)' }}>
        {isLoading ? 'Zoeken...' : `${results.length} ${results.length === 1 ? 'resultaat' : 'resultaten'} gevonden`}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-44 sm:h-52" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Geen games gevonden voor &ldquo;{q}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {results.map((r) => (
            <Link
              key={r.steam_appid}
              to={`/game/${r.steam_appid}`}
              className="group block rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.84)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(110, 190, 235, 0.42)',
                boxShadow: '0 3px 12px rgba(40, 110, 165, 0.08)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1278a8'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(18, 120, 168, 0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110, 190, 235, 0.42)'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(40, 110, 165, 0.08)' }}
            >
              <div className="relative w-full h-24 sm:h-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(168,216,242,0.7), rgba(201,236,255,0.75))' }}>
                <button
                  type="button"
                  aria-label={wishlistByAppid.has(r.steam_appid) ? `Verwijder ${r.name} uit verlanglijst` : `Voeg ${r.name} toe aan verlanglijst`}
                  title={wishlistByAppid.has(r.steam_appid) ? 'Verwijder van verlanglijst' : 'Voeg toe aan verlanglijst'}
                  onClick={(event) => handleWishlistClick(event, r.steam_appid)}
                  disabled={pendingWishlistAppids.has(r.steam_appid)}
                  className={`wishlist-heart-btn absolute top-2 right-2 z-20 rounded-full p-2 ${wishlistByAppid.has(r.steam_appid) ? 'opacity-100 is-active' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'} ${pendingWishlistAppids.has(r.steam_appid) ? 'cursor-not-allowed is-busy' : ''}`}
                  style={{
                    background: wishlistByAppid.has(r.steam_appid) ? 'rgba(232, 121, 160, 0.9)' : 'rgba(8, 32, 48, 0.65)',
                    backdropFilter: 'blur(4px)',
                    border: wishlistByAppid.has(r.steam_appid) ? '1px solid rgba(232,121,160,0.95)' : '1px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
                    outline: 'none',
                  }}
                >
                  <Heart
                    className="wishlist-heart-icon"
                    size={14}
                    color="#ffffff"
                    fill={wishlistByAppid.has(r.steam_appid) ? '#ffffff' : 'transparent'}
                  />
                </button>
                <img
                  src={r.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${r.steam_appid}/header.jpg`}
                  alt={r.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden'
                  }}
                />
              </div>
              <div className="p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm font-medium mb-1.5 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {r.name}
                </p>
                {r.is_in_db && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(18,120,168,0.12)', color: '#1278a8', border: '1px solid rgba(18,120,168,0.25)' }}>
                    bijgehouden
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
