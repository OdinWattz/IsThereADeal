import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Heart } from 'lucide-react'
import { addToWishlist, getWishlist, removeFromWishlist, searchGames } from '../api/games'
import type { SearchResult } from '../api/games'
import { OptimizedImage } from './OptimizedImage'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

interface SearchBarProps {
  onSelectGame?: (result: SearchResult) => void
  placeholder?: string
}

export function SearchBar({ onSelectGame, placeholder = 'Search games...' }: SearchBarProps = {}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [pendingWishlistAppids, setPendingWishlistAppids] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const authenticated = isAuthenticated()
  const qc = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchGames(val)
        setResults(data.slice(0, 8))
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    if (onSelectGame) {
      onSelectGame(result)
    } else {
      navigate(`/game/${result.steam_appid}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length < 2) return
    setOpen(false)
    setQuery('')
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const handleWishlistClick = (event: React.MouseEvent<HTMLButtonElement>, steamAppid: string) => {
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
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5888a5', pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="input-aero"
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: '36px',
              paddingTop: '9px',
              paddingBottom: '9px',
              fontSize: '0.875rem',
            }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(18, 120, 168, 0.72)')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(85, 168, 215, 0.55)')}
          />
          {loading && (
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', border: '2px solid #1278a8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          )}
        </div>
      </form>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', width: '100%',
          background: 'rgba(230, 248, 255, 0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(90, 175, 225, 0.5)',
          borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(30, 100, 160, 0.18)',
          zIndex: 100, overflow: 'hidden',
        }}>
          {results.map((r) => (
            <div
              key={r.steam_appid}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect(r)
                }
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', background: 'none',
                cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid rgba(90, 175, 225, 0.25)',
                outline: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(180, 228, 252, 0.55)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {r.header_image && (
                <OptimizedImage src={r.header_image} alt="" style={{ width: '52px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '0.875rem', color: '#082030', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              {r.is_in_db && (
                <span style={{ flexShrink: 0, fontSize: '0.7rem', backgroundColor: 'rgba(18,120,168,0.15)', color: '#1278a8', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(18,120,168,0.25)' }}>tracked</span>
              )}
              <button
                type="button"
                aria-label={wishlistByAppid.has(r.steam_appid) ? `Verwijder ${r.name} uit verlanglijst` : `Voeg ${r.name} toe aan verlanglijst`}
                title={wishlistByAppid.has(r.steam_appid) ? 'Verwijder van verlanglijst' : 'Voeg toe aan verlanglijst'}
                onClick={(event) => handleWishlistClick(event, r.steam_appid)}
                disabled={pendingWishlistAppids.has(r.steam_appid)}
                className={`wishlist-heart-btn rounded-full p-2 ${wishlistByAppid.has(r.steam_appid) ? 'is-active' : ''} ${pendingWishlistAppids.has(r.steam_appid) ? 'cursor-not-allowed is-busy' : ''}`}
                style={{
                  flexShrink: 0,
                  background: wishlistByAppid.has(r.steam_appid) ? 'rgba(232, 121, 160, 0.9)' : 'rgba(8, 32, 48, 0.65)',
                  border: wishlistByAppid.has(r.steam_appid) ? '1px solid rgba(232,121,160,0.95)' : '1px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
                  outline: 'none',
                }}
              >
                <Heart
                  className="wishlist-heart-icon"
                  size={13}
                  color="#ffffff"
                  fill={wishlistByAppid.has(r.steam_appid) ? '#ffffff' : 'transparent'}
                />
              </button>
            </div>
          ))}
          <button
            onClick={() => { setOpen(false); setQuery(''); navigate(`/search?q=${encodeURIComponent(query.trim())}`) }}
            style={{
              width: '100%', padding: '10px 14px', border: 'none', background: 'none',
              cursor: 'pointer', textAlign: 'center', color: '#1278a8', fontSize: '0.82rem',
              fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(180, 228, 252, 0.55)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Alle resultaten bekijken →
          </button>
        </div>
      )}
    </div>
  )
}
