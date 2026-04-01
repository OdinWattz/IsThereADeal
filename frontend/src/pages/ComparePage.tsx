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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <ArrowLeftRight size={32} className="text-purple-400" />
          Game Vergelijken
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Vergelijk tot 4 games naast elkaar
        </p>
      </div>

      {/* Search to Add Games */}
      <div className="mb-6 bg-[#111320] border border-[#1e2235] rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-300 mb-3">
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
          <ArrowLeftRight size={64} className="mx-auto mb-4 text-gray-600 opacity-30" />
          <p className="text-gray-400 mb-2 text-lg">Geen games geselecteerd</p>
          <p className="text-gray-500 text-sm">Zoek en voeg games toe om ze te vergelijken</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden relative"
            >
              {/* Remove Button */}
              <button
                onClick={() => removeGame(game.steam_appid)}
                className="absolute top-2 right-2 z-10 p-2 bg-black/70 hover:bg-red-600 text-white rounded-lg transition-colors"
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
                <h3 className="text-white font-semibold text-lg line-clamp-2">
                  {game.name}
                </h3>

                {/* Price */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Beste Prijs</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-400">
                      {fmt(game.best_price)}
                    </span>
                    {game.best_store && (
                      <span className="text-xs text-gray-500">via {game.best_store}</span>
                    )}
                  </div>
                </div>

                {/* Scores */}
                <div className="space-y-2">
                  {game.metacritic_score && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
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
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Star size={14} className="text-blue-400" />
                        <span>Steam Reviews</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-400">
                        {game.steam_review_score}%
                      </span>
                    </div>
                  )}

                  {game.steam_review_count && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Review Count</span>
                      <span className="text-sm font-semibold text-gray-300">
                        {game.steam_review_count.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {game.player_count_current && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Users size={14} className="text-purple-400" />
                        <span>Players Now</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-400">
                        {game.player_count_current.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {game.genres && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Genres</p>
                    <p className="text-xs text-gray-300 line-clamp-2">{game.genres}</p>
                  </div>
                )}

                {/* Developers */}
                {game.developers && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Developer</p>
                    <p className="text-xs text-gray-300 line-clamp-1">{game.developers}</p>
                  </div>
                )}

                {/* Release Date */}
                {game.release_date && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Release Date</p>
                    <p className="text-xs text-gray-300">{game.release_date}</p>
                  </div>
                )}

                {/* Link to Game Page */}
                <a
                  href={`/game/${game.steam_appid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <span>View Details</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}

          {/* Add More Placeholder */}
          {games.length < 4 && (
            <div className="bg-[#111320] border border-[#1e2235] border-dashed rounded-xl flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Plus size={48} className="mx-auto mb-3 text-gray-600" />
                <p className="text-gray-500 text-sm">Voeg nog een game toe</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
