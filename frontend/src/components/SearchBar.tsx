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
    if (results.length > 0) handleSelect(results[0])
  }

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search games..."
            className="w-full bg-[#1e2235] border border-[#2a2d3e] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </form>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl shadow-2xl z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.steam_appid}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#252840] transition-colors text-left"
            >
              {r.header_image && (
                <img src={r.header_image} alt="" className="w-12 h-8 object-cover rounded" />
              )}
              <span className="text-sm text-slate-200 truncate">{r.name}</span>
              {r.is_in_db && (
                <span className="ml-auto shrink-0 text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">tracked</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
