import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SearchBar } from '../components/SearchBar'
import { ArrowLeftRight, X, Plus, ExternalLink, Award, Star, Users } from 'lucide-react'
import type { Game } from '../api/games'
import api from '../api/client'
import SEO from '../components/SEO'

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [compareIds, setCompareIds] = useState<string[]>(
    searchParams.get('games')?.split(',').filter(Boolean) || []
  )

  const { data: games = [] } = useQuery({
    queryKey: ['compare', compareIds],
    queryFn: async () => {
      if (compareIds.length === 0) return []
      const results = await Promise.all(
        compareIds.map((appid) =>
          api.get<Game>(`/games/${appid}`).then((r) => r.data)
        )
      )
      return results
    },
    enabled: compareIds.length > 0,
  })

  const addGame = (appid: string) => {
    if (compareIds.length >= 4) return
    if (compareIds.includes(appid)) return
    const newIds = [...compareIds, appid]
    setCompareIds(newIds)
    setSearchParams({ games: newIds.join(',') })
  }

  const removeGame = (appid: string) => {
    const newIds = compareIds.filter((id) => id !== appid)
    setCompareIds(newIds)
    setSearchParams({ games: newIds.join(',') })
  }

  const fmt = (v?: number | null) => (v != null ? `€${v.toFixed(2).replace('.', ',')}` : '—')

  return (
    <>
      <SEO
        title="Games Vergelijken - Vergelijk Prijzen en Specs"
        description="Vergelijk tot 4 games naast elkaar. Zie prijzen, specs, reviews en scores in één overzicht. Vind de beste game voor jou."
        keywords="games vergelijken, game comparison, vergelijk games, game specs, game prijzen vergelijken, compare games"
        url="https://serpodin.nl/compare"
      />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
          <ArrowLeftRight size={32} style={{color: 'var(--accent)'}} />
          Game Vergelijken
        </h1>
        <p className="text-sm sm:text-base" style={{color: 'var(--text-secondary)'}}>
          Vergelijk tot 4 games naast elkaar
        </p>
      </div>

      {/* Search to Add Games */}
      <div className="mb-6 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(90,175,225,0.45)', backdropFilter: 'blur(8px)' }}>
        <label className="block text-sm font-medium mb-3" style={{color: 'var(--text-secondary)'}}>
          Voeg games toe om te vergelijken ({compareIds.length}/4)
        </label>
        <SearchBar
          onSelectGame={(game) => addGame(game.steam_appid)}
          placeholder="Zoek een game om toe te voegen..."
        />
      </div>

      {/* Comparison Grid */}
      {games.length === 0 ? (
        <div className="text-center py-20">
          <ArrowLeftRight size={64} className="mx-auto mb-4 opacity-30" style={{color: 'var(--text-tertiary)'}} />
          <p className="mb-2 text-lg" style={{color: 'var(--text-secondary)'}}>Geen games geselecteerd</p>
          <p className="text-sm" style={{color: 'var(--text-tertiary)'}}>Zoek en voeg games toe om ze te vergelijken</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="rounded-xl overflow-hidden relative"
              style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(110,190,235,0.42)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(40,110,165,0.1)' }}
            >
              {/* Remove Button */}
              <button
                onClick={() => removeGame(game.steam_appid)}
                className="absolute top-2 right-2 z-10 p-2 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.85)', color: '#e05050', border: '1px solid rgba(90,175,225,0.45)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)'; (e.currentTarget as HTMLElement).style.color = '#e05050' }}
              >
                <X size={16} />
              </button>

              {/* Game Image */}
              <img
                src={game.header_image || ''}
                alt={game.name}
                className="w-full h-48 object-cover"
              />

              {/* Game Info */}
              <div className="p-4 space-y-4">
                {/* Name */}
                <h3 className="font-semibold text-lg line-clamp-2" style={{color: 'var(--text-primary)'}}>{game.name}</h3>

                {/* Price */}
                <div>
                  <p className="text-xs mb-1" style={{color: 'var(--text-secondary)'}}>Beste Prijs</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" style={{color: 'var(--green)'}}>{fmt(game.best_price)}</span>
                    {game.best_store && (
                      <span className="text-xs" style={{color: 'var(--text-tertiary)'}}>via {game.best_store}</span>
                    )}
                  </div>
                </div>

                {/* Scores */}
                <div className="space-y-2">
                  {game.metacritic_score && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs" style={{color: 'var(--text-secondary)'}}>
                        <Award size={14} className="text-yellow-400" />
                        <span>Metacritic</span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          game.metacritic_score >= 75
                            ? 'text-green-400'
                            : game.metacritic_score >= 50
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {game.metacritic_score}
                      </span>
                    </div>
                  )}

                  {game.steam_review_score && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs" style={{color: 'var(--text-secondary)'}}>
                        <Star size={14} style={{color: '#1480b8'}} />
                        <span>Steam Reviews</span>
                      </div>
                      <span className="text-sm font-semibold" style={{color: '#1480b8'}}>
                        {game.steam_review_score}%
                      </span>
                    </div>
                  )}

                  {game.steam_review_count && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{color: 'var(--text-secondary)'}}>Review Count</span>
                      <span className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                        {game.steam_review_count.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {game.player_count_current && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs" style={{color: 'var(--text-secondary)'}}>
                        <Users size={14} style={{color: 'var(--accent)'}} />
                        <span>Players Now</span>
                      </div>
                      <span className="text-sm font-semibold" style={{color: 'var(--accent)'}}>
                        {game.player_count_current.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {game.genres && (
                  <div>
                    <p className="text-xs mb-1" style={{color: 'var(--text-secondary)'}}>Genres</p>
                    <p className="text-xs line-clamp-2" style={{color: 'var(--text-tertiary)'}}>{game.genres}</p>
                  </div>
                )}

                {/* Developers */}
                {game.developers && (
                  <div>
                    <p className="text-xs mb-1" style={{color: 'var(--text-secondary)'}}>Developer</p>
                    <p className="text-xs line-clamp-1" style={{color: 'var(--text-tertiary)'}}>{game.developers}</p>
                  </div>
                )}

                {/* Release Date */}
                {game.release_date && (
                  <div>
                    <p className="text-xs mb-1" style={{color: 'var(--text-secondary)'}}>Release Date</p>
                    <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>{game.release_date}</p>
                  </div>
                )}

                {/* Link to Game Page */}
                <a
                  href={`/game/${game.steam_appid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 btn-aero rounded-lg text-sm font-medium"
                >
                  <span>View Details</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}

          {/* Add More Placeholder */}
          {games.length < 4 && (
            className="border border-dashed rounded-xl flex items-center justify-center min-h-[400px]"
              style={{ background: 'rgba(255,255,255,0.4)', borderColor: 'rgba(90,175,225,0.5)', backdropFilter: 'blur(4px)' }}
            >
              <div className="text-center">
                <Plus size={48} className="mx-auto mb-3 opacity-40" style={{color: 'var(--text-tertiary)'}} />
                <p className="text-sm" style={{color: 'var(--text-tertiary)'}}>Voeg nog een game toe</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
