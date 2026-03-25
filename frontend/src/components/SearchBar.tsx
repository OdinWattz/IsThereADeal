import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchGames } from '../api/games'
import type { SearchResult } from '../api/games'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    navigate(`/game/${result.steam_appid}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length < 2) return
    setOpen(false)
    setQuery('')
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search games..."
            style={{
              width: '100%',
              backgroundColor: '#191c2a',
              border: '1px solid #2a2d3e',
              borderRadius: '10px',
              paddingLeft: '36px',
              paddingRight: '36px',
              paddingTop: '9px',
              paddingBottom: '9px',
              fontSize: '0.875rem',
              color: '#e2e8f0',
              outline: 'none',
            }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = '#7c3aed')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#2a2d3e')}
          />
          {loading && (
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          )}
        </div>
      </form>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', width: '100%',
          backgroundColor: '#13152a', border: '1px solid #2a2d3e',
          borderRadius: '12px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          zIndex: 100, overflow: 'hidden',
        }}>
          {results.map((r) => (
            <button
              key={r.steam_appid}
              onClick={() => handleSelect(r)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', border: 'none', background: 'none',
                cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid #1e2235',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e2235')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {r.header_image && (
                <img src={r.header_image} alt="" style={{ width: '52px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              {r.is_in_db && (
                <span style={{ flexShrink: 0, fontSize: '0.7rem', backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa', padding: '2px 8px', borderRadius: '999px' }}>tracked</span>
              )}
            </button>
          ))}
          <button
            onClick={() => { setOpen(false); setQuery(''); navigate(`/search?q=${encodeURIComponent(query.trim())}`) }}
            style={{
              width: '100%', padding: '10px 14px', border: 'none', background: 'none',
              cursor: 'pointer', textAlign: 'center', color: '#a78bfa', fontSize: '0.82rem',
              fontWeight: 500,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e2235')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Alle resultaten bekijken →
          </button>
        </div>
      )}
    </div>
  )
}
