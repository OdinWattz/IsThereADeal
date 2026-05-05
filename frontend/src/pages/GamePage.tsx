import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGame, getPriceHistory, addToWishlist, createAlert, getDlcDeals } from '../api/games'
import type { DlcDeal } from '../api/games'
import { Link } from 'react-router-dom'
import { PriceTable } from '../components/PriceTable'
import { PriceHistoryChart } from '../components/PriceHistoryChart'
import { HistoricLowBadge } from '../components/HistoricLowBadge'
import { useAuthStore } from '../store/authStore'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Heart, Bell, RefreshCw, ExternalLink, Calendar, Cpu, Tag, ChevronLeft } from 'lucide-react'
import SEO from '../components/SEO'

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.84)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(90,175,225,0.45)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
  boxShadow: '0 4px 20px rgba(50,120,170,0.10)',
}

const actionBtn = (bg: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '9px 18px',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  backgroundColor: bg,
  color: '#fff',
  textDecoration: 'none',
})

export function GamePage() {
  const { appid } = useParams<{ appid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const { addToRecentlyViewed } = useRecentlyViewed()
  const [alertPrice, setAlertPrice] = useState('')
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [showKeyResellers, setShowKeyResellers] = useState(false)

  const { data: game, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['game', appid, showKeyResellers],
    queryFn: () => getGame(appid!, false, showKeyResellers),
    enabled: !!appid,
    staleTime: 1000 * 60 * 10,  // 10 minutes
    gcTime: 1000 * 60 * 30,     // Keep in cache for 30 minutes
  })

  // Add to recently viewed when game loads
  useEffect(() => {
    if (game && game.id !== 0) {
      addToRecentlyViewed({
        steam_appid: game.steam_appid,
        name: game.name,
        header_image: game.header_image,
      })
    }
  }, [game, addToRecentlyViewed])

  const { data: history = [] } = useQuery({
    queryKey: ['history', appid],
    queryFn: () => getPriceHistory(appid!),
    enabled: !!appid,
    staleTime: 1000 * 60 * 30,
    retry: 2,  // Retry twice on failure
  })

  const { data: dlcDeals = [] } = useQuery({
    queryKey: ['dlc-deals', appid],
    queryFn: () => getDlcDeals(appid!),
    enabled: !!appid,
    staleTime: 1000 * 60 * 30,
  })

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      // Use steam_appid directly - backend will handle saving if needed
      return addToWishlist(appid!)
    },
    onSuccess: () => { toast.success('Toegevoegd aan verlanglijst!'); qc.invalidateQueries({ queryKey: ['wishlist'] }) },
    onError: (e: unknown) => toast.error((e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ?? 'Mislukt'),
  })

  const alertMutation = useMutation({
    mutationFn: async (price: number) => {
      return createAlert(appid!, price)
    },
    onSuccess: () => {
      toast.success('Prijsalert ingesteld!')
      setShowAlertForm(false)
      setAlertPrice('')
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
    onError: (e: unknown) => toast.error((e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ?? 'Mislukt'),
  })

  const handleRefresh = async () => {
    await getGame(appid!, true)
    refetch()
    toast.success('Prijzen vernieuwd!')
  }

  const formatPrice = (val?: number | null) =>
    val != null ? `€${val.toFixed(2).replace('.', ',')}` : null

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px', marginBottom: '16px' }} />
        ))}
      </div>
    )
  }

  if (error || !game) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#f87171', marginBottom: '16px' }}>Game niet gevonden of laden mislukt.</p>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
          ← Terug
        </button>
      </div>
    )
  }

  const steamPrice = game.prices.find((p) => p.store_name === 'Steam')

  return (
    <>
      {game && (
        <SEO
          title={`${game.name} Prijzen & Deals`}
          description={`Vergelijk prijzen voor ${game.name} van 30+ winkels. ${game.short_description || 'Vind de beste deals en kortingen.'}`}
          keywords={`${game.name}, ${game.name} prijs, ${game.name} deal, ${game.name} korting, ${game.genres || 'game'}`}
          image={game.header_image}
          url={`https://serpodin.nl/game/${appid}`}
          type="article"
        />
      )}
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm mb-4 sm:mb-6 transition-colors"
        style={{color: 'var(--text-tertiary)'}}
      >
        <ChevronLeft size={16} /> Terug
      </button>

      {/* Hero */}
      <div className="flex flex-col md:flex-row gap-6 sm:gap-7 mb-6 sm:mb-7">
        <img
          src={game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`}
          alt={game.name}
          className="w-full md:w-80 rounded-xl object-cover"
        />
        <div className="flex-1 min-w-0">
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>{game.name}</h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {game.release_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                <Calendar size={13} /> {game.release_date}
              </span>
            )}
            {game.developers && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                <Cpu size={13} /> {game.developers}
              </span>
            )}
            {game.genres && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                <Tag size={13} /> {game.genres}
              </span>
            )}
          </div>

          {/* Review Scores & Player Count */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {game.metacritic_score && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: game.metacritic_score >= 75 ? 'rgba(34,197,94,0.15)' : game.metacritic_score >= 50 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${game.metacritic_score >= 75 ? 'rgba(34,197,94,0.3)' : game.metacritic_score >= 50 ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: game.metacritic_score >= 75 ? '#4ade80' : game.metacritic_score >= 50 ? '#eab308' : '#ef4444' }}>
                  {game.metacritic_score}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Metacritic</span>
              </div>
            )}

            {game.steam_review_count && game.steam_review_count > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(20,128,184,0.1)',
                border: '1px solid rgba(20,128,184,0.25)',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1480b8' }}>
                  {game.steam_review_count.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>reviews</span>
              </div>
            )}

            {game.player_count_current !== undefined && game.player_count_current !== null && game.player_count_current > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(8,175,208,0.1)',
                border: '1px solid rgba(8,175,208,0.25)',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#08afd0' }}>
                  {game.player_count_current.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>spelers nu</span>
              </div>
            )}
          </div>

          {game.short_description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '20px' }}>
              {game.short_description}
            </p>
          )}

          {game.best_price != null && (
            <div style={{
              display: 'inline-block',
              backgroundColor: 'rgba(22,163,74,0.12)',
              border: '1px solid rgba(22,163,74,0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: '0.7rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Beste prijs</p>
                <HistoricLowBadge
                  currentPrice={game.best_price}
                  historicLowPrice={game.historic_low_price}
                  historicLowDate={game.historic_low_date}
                  size="sm"
                />
              </div>
              <p style={{ fontSize: '2.2rem', fontWeight: 700, color: '#4ade80', lineHeight: 1 }}>
                {formatPrice(game.best_price)}
              </p>
              {game.best_store && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>via {game.best_store}</p>
              )}
              {steamPrice?.regular_price && game.best_price < steamPrice.regular_price && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px', textDecoration: 'line-through' }}>
                  Steam: {formatPrice(steamPrice.regular_price)}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {game.steam_url && (
              <a href={game.steam_url} target="_blank" rel="noopener noreferrer"
                style={{ ...actionBtn('#1b2838'), border: '1px solid #2a475e' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a475e')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1b2838')}
              >
                <ExternalLink size={14} /> Steam
              </a>
            )}

            {isAuthenticated() && (
              <>
                <button
                  onClick={() => wishlistMutation.mutate()}
                  disabled={wishlistMutation.isPending}
                  style={{ ...actionBtn('#1480b8'), opacity: wishlistMutation.isPending ? 0.5 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0d6799')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1480b8')}
                >
                  <Heart size={14} /> Verlanglijst
                </button>
                <button
                  onClick={() => setShowAlertForm(!showAlertForm)}
                  style={actionBtn('#b45309')}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#92400e')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#b45309')}
                >
                  <Bell size={14} /> Alert
                </button>
              </>
            )}

            <button
              onClick={handleRefresh}
              disabled={isFetching}
              style={{ ...actionBtn('rgba(255,255,255,0.7)'), color: 'var(--text-secondary)' as string, opacity: isFetching ? 0.5 : 1, border: '1px solid rgba(90,175,225,0.45)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(200,235,255,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)')}
            >
              <RefreshCw size={14} />
              Vernieuwen
            </button>
          </div>

          {showAlertForm && (
            <div style={{
              marginTop: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
              padding: '16px', background: 'rgba(230,248,255,0.88)', border: '1px solid rgba(90,175,225,0.45)', borderRadius: '10px', backdropFilter: 'blur(8px)',
            }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Alert als prijs onder</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(90,170,215,0.55)', borderRadius: '8px', padding: '8px 12px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>€</span>
                <input
                  type="number" step="0.01" min="0"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  style={{ width: '80px', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', border: 'none', outline: 'none' }}
                  placeholder="9,99"
                />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>komt</span>
              <button
                onClick={() => alertMutation.mutate(parseFloat(alertPrice))}
                disabled={!alertPrice || alertMutation.isPending}
                style={{ ...actionBtn('#b45309'), opacity: !alertPrice || alertMutation.isPending ? 0.5 : 1 }}
              >
                Instellen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Price Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Alle prijzen ({game.prices.length} winkels)
          </h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={showKeyResellers}
              onChange={(e) => setShowKeyResellers(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Toon key resellers (trager)</span>
          </label>
        </div>
        <PriceTable prices={game.prices} gameName={game.name} />
      </div>

      {/* Price History */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Prijsgeschiedenis</h2>
        <PriceHistoryChart history={history} />
      </div>

      {/* DLC Deals */}
      {dlcDeals.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            🎁 DLC in de aanbieding
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
            {dlcDeals.length} DLC{dlcDeals.length !== 1 ? "'s" : ''} voor dit spel zijn momenteel afgeprijsd
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dlcDeals.map((dlc: DlcDeal) => (
              <Link key={dlc.steam_appid} to={`/game/${dlc.steam_appid}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', background: 'rgba(240,250,255,0.8)',
                  border: '1px solid rgba(110,190,235,0.4)', borderRadius: '10px',
                  cursor: 'pointer', transition: 'border-color .15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#1480b8')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(110,190,235,0.4)')}
                >
                  <span style={{
                    flexShrink: 0, backgroundColor: '#166534', color: '#4ade80',
                    fontWeight: 700, fontSize: '0.75rem', padding: '3px 7px', borderRadius: '6px',
                  }}>
                    -{dlc.discount_percent}%
                  </span>
                  <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.875rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {dlc.title}
                  </span>
                  <span style={{ flexShrink: 0, color: '#4ade80', fontWeight: 600, fontSize: '0.9rem' }}>
                    €{(dlc.sale_price ?? 0).toFixed(2).replace('.', ',')}
                  </span>
                  {dlc.regular_price && (
                    <span style={{ flexShrink: 0, color: 'var(--text-tertiary)', fontSize: '0.8rem', textDecoration: 'line-through' }}>
                      €{dlc.regular_price.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  <span style={{ flexShrink: 0, color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>{dlc.store_name}</span>
                  {dlc.url && (
                    <a href={dlc.url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ flexShrink: 0, color: 'var(--accent)', fontSize: '0.78rem', textDecoration: 'none' }}
                    >
                      Kopen →
                    </a>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
