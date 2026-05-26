import { useState, type MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addToWishlist, getFeaturedDeals, getWishlist, removeFromWishlist } from '../api/games'
import { TrendingDown, Zap, BarChart2, Heart } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
// import { DealOfTheDay } from '../components/DealOfTheDay'
import { RecentlyViewed } from '../components/RecentlyViewed'
import SEO from '../components/SEO'
import { OptimizedImage } from '../components/OptimizedImage'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export function HomePage() {
  const { isAuthenticated } = useAuthStore()
  const authenticated = isAuthenticated()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [pendingWishlistAppids, setPendingWishlistAppids] = useState<Set<string>>(new Set())

  const { data: featured = [], isLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeaturedDeals,
    staleTime: 1000 * 60 * 15,
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
    <>
      <SEO />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
      {/* Hero */}
      <div className="text-center mb-12 sm:mb-16 flex flex-col items-center">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-4 leading-tight text-center w-full"
          style={{ color: 'var(--text-primary)', textShadow: '0 1px 3px rgba(255,255,255,0.6)' }}
        >
          Find the{' '}
          <span style={{ background: 'linear-gradient(135deg, #0ab5d8, #1278a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            best game deals
          </span>
        </h1>
        <p
          className="text-base sm:text-lg max-w-xl mx-auto mb-6 sm:mb-8 px-4 text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          Compare prices across Steam, GOG, Humble, Fanatical, key resellers and more.
        </p>
        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {[
            { icon: <TrendingDown size={15} />, label: '30+ stores compared' },
            { icon: <Zap size={15} />, label: 'Live price alerts' },
            { icon: <BarChart2 size={15} />, label: 'Price history charts' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(90, 175, 225, 0.45)',
                color: 'var(--text-secondary)',
                boxShadow: '0 2px 8px rgba(40, 110, 165, 0.1)',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>{icon}</span>
              <span className="text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deal of the Day */}
      {/* <DealOfTheDay /> */}

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Steam Featured Deals */}
      <section>
        <h2
          className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <TrendingDown size={20} style={{ color: 'var(--green)' }} />
          Steam Featured Deals
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="skeleton rounded-xl h-48 sm:h-56"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {featured.slice(0, 100).map((game) => (
              (() => {
                const discountPercent = game.discount_percent ?? 0
                const regularPrice = game.regular_price ?? 0
                const salePrice = game.sale_price ?? regularPrice
                const hasHeaderImage = !!game.header_image?.trim()
                const fallbackHeaderImage = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`
                const cardHeaderImage = hasHeaderImage ? game.header_image!.trim() : fallbackHeaderImage

                return (
                  <Link
                    key={game.steam_appid}
                    to={`/game/${game.steam_appid}`}
                    className="group block rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      background: 'rgba(255, 255, 255, 0.84)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(110, 190, 235, 0.42)',
                      boxShadow: '0 3px 12px rgba(40, 110, 165, 0.09)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1278a8'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(18, 120, 168, 0.2)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110, 190, 235, 0.42)'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(40, 110, 165, 0.09)' }}
                  >
                    <div className="relative w-full h-24 sm:h-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(168,216,242,0.7), rgba(201,236,255,0.75))' }}>
                      <div
                        className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs font-medium"
                        style={{ color: 'rgba(8,32,48,0.6)' }}
                      >
                        {game.name}
                      </div>
                      <button
                        type="button"
                        aria-label={wishlistByAppid.has(game.steam_appid) ? `Verwijder ${game.name} uit verlanglijst` : `Voeg ${game.name} toe aan verlanglijst`}
                        title={wishlistByAppid.has(game.steam_appid) ? 'Verwijder van verlanglijst' : 'Voeg toe aan verlanglijst'}
                        onClick={(event) => handleWishlistClick(event, game.steam_appid)}
                        disabled={pendingWishlistAppids.has(game.steam_appid)}
                        className={`wishlist-heart-btn absolute top-2 right-2 z-20 rounded-full p-2 ${wishlistByAppid.has(game.steam_appid) ? 'opacity-100 is-active' : hasHeaderImage ? 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100' : 'opacity-100'} ${pendingWishlistAppids.has(game.steam_appid) ? 'cursor-not-allowed is-busy' : ''}`}
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
                        src={cardHeaderImage}
                        alt={game.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.visibility = 'hidden'
                        }}
                      />
                      {discountPercent > 0 && (
                        <div className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'linear-gradient(135deg, #1ea866, #15924e)', boxShadow: '0 2px 6px rgba(22,154,88,0.3)' }}>
                          -{discountPercent}%
                        </div>
                      )}
                    </div>
                    <div className="p-2 sm:p-3">
                      <p
                        className="text-xs sm:text-sm mb-1 sm:mb-2 truncate font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {game.name}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--green)' }}>
                          €{salePrice.toFixed(2).replace('.', ',')}
                        </span>
                        {regularPrice > salePrice && (
                          <span
                            className="text-xs line-through"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            €{regularPrice.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })()
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  )
}
