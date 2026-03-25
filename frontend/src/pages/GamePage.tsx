import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGame, getPriceHistory, addToWishlist, createAlert, getDlcDeals } from '../api/games'
import type { DlcDeal } from '../api/games'
import { PriceTable } from '../components/PriceTable'
import { PriceHistoryChart } from '../components/PriceHistoryChart'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Heart, Bell, RefreshCw, ExternalLink, Calendar, Cpu, Tag, ChevronLeft } from 'lucide-react'

const cardStyle: React.CSSProperties = {
  backgroundColor: '#111320',
  border: '1px solid #1e2235',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
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

  const { data: dlcDeals = [] } = useQuery({
    queryKey: ['dlc-deals', appid],
    queryFn: () => getDlcDeals(appid!),
    enabled: !!appid,
    staleTime: 1000 * 60 * 30,
  })

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      // If game not yet in DB (id=0), save it first via refresh
      if (game!.id === 0) {
        const saved = await getGame(appid!, true)
        return addToWishlist(saved.id)
      }
      return addToWishlist(game!.id)
    },
    onSuccess: () => { toast.success('Toegevoegd aan verlanglijst!'); qc.invalidateQueries({ queryKey: ['wishlist'] }) },
    onError: (e: unknown) => toast.error((e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ?? 'Mislukt'),
  })

  const alertMutation = useMutation({
    mutationFn: (price: number) => createAlert(game!.id, price),
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
          <div key={i} style={{ height: '80px', backgroundColor: '#111320', borderRadius: '12px', marginBottom: '16px' }} />
        ))}
      </div>
    )
  }

  if (error || !game) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#f87171', marginBottom: '16px' }}>Game niet gevonden of laden mislukt.</p>
        <button onClick={() => navigate(-1)} style={{ color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
          ← Terug
        </button>
      </div>
    )
  }

  const steamPrice = game.prices.find((p) => p.store_name === 'Steam')

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '24px', padding: 0 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
      >
        <ChevronLeft size={16} /> Terug
      </button>

      {/* Hero */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', marginBottom: '28px' }}>
        <img
          src={game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`}
          alt={game.name}
          style={{ width: '320px', maxWidth: '100%', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: '260px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{game.name}</h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {game.release_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#64748b' }}>
                <Calendar size={13} /> {game.release_date}
              </span>
            )}
            {game.developers && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#64748b' }}>
                <Cpu size={13} /> {game.developers}
              </span>
            )}
            {game.genres && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#64748b' }}>
                <Tag size={13} /> {game.genres}
              </span>
            )}
          </div>

          {game.short_description && (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '20px' }}>
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
              <p style={{ fontSize: '0.7rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Beste prijs</p>
              <p style={{ fontSize: '2.2rem', fontWeight: 700, color: '#4ade80', lineHeight: 1 }}>
                {formatPrice(game.best_price)}
              </p>
              {game.best_store && (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>via {game.best_store}</p>
              )}
              {steamPrice?.regular_price && game.best_price < steamPrice.regular_price && (
                <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px', textDecoration: 'line-through' }}>
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
                  style={{ ...actionBtn('#7c3aed'), opacity: wishlistMutation.isPending ? 0.5 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7c3aed')}
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
              style={{ ...actionBtn('#1e2235'), color: '#94a3b8', opacity: isFetching ? 0.5 : 1, border: '1px solid #2a2d3e' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#252840')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e2235')}
            >
              <RefreshCw size={14} />
              Vernieuwen
            </button>
          </div>

          {showAlertForm && (
            <div style={{
              marginTop: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
              padding: '16px', backgroundColor: '#0d0f1a', border: '1px solid #1e2235', borderRadius: '10px',
            }}>
              <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>Alert als prijs onder</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1e2235', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '8px 12px' }}>
                <span style={{ color: '#64748b' }}>€</span>
                <input
                  type="number" step="0.01" min="0"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  style={{ width: '80px', backgroundColor: 'transparent', color: '#fff', fontSize: '0.875rem', border: 'none', outline: 'none' }}
                  placeholder="9,99"
                />
              </div>
              <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>komt</span>
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
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
          Alle prijzen ({game.prices.length} winkels)
        </h2>
        <PriceTable prices={game.prices} gameName={game.name} />
      </div>

      {/* Price History */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>Prijsgeschiedenis</h2>
        <PriceHistoryChart history={history} />
      </div>

      {/* DLC Deals */}
      {dlcDeals.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
            🎁 DLC in de aanbieding
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '16px' }}>
            {dlcDeals.length} DLC{dlcDeals.length !== 1 ? "'s" : ''} voor dit spel zijn momenteel afgeprijsd
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dlcDeals.map((dlc: DlcDeal) => (
              <div key={dlc.steam_appid} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', backgroundColor: '#0d0f1a',
                border: '1px solid #1e2235', borderRadius: '10px',
              }}>
                <span style={{
                  flexShrink: 0, backgroundColor: '#166534', color: '#4ade80',
                  fontWeight: 700, fontSize: '0.75rem', padding: '3px 7px', borderRadius: '6px',
                }}>
                  -{dlc.discount_percent}%
                </span>
                <span style={{ flex: 1, color: '#e2e8f0', fontSize: '0.875rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {dlc.title}
                </span>
                <span style={{ flexShrink: 0, color: '#4ade80', fontWeight: 600, fontSize: '0.9rem' }}>
                  €{(dlc.sale_price ?? 0).toFixed(2).replace('.', ',')}
                </span>
                {dlc.regular_price && (
                  <span style={{ flexShrink: 0, color: '#475569', fontSize: '0.8rem', textDecoration: 'line-through' }}>
                    €{dlc.regular_price.toFixed(2).replace('.', ',')}
                  </span>
                )}
                <span style={{ flexShrink: 0, color: '#64748b', fontSize: '0.78rem' }}>{dlc.store_name}</span>
                {dlc.url && (
                  <a href={dlc.url} target="_blank" rel="noopener noreferrer"
                    style={{ flexShrink: 0, color: '#60a5fa', fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    Kopen →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
