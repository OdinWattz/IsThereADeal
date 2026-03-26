import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchGames } from '../api/games'
import { Search } from 'lucide-react'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchGames(q),
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2.5">
        <Search size={22} className="text-purple-400" />
        Zoekresultaten voor &ldquo;{q}&rdquo;
      </h1>
      <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-7">
        {isLoading ? 'Zoeken...' : `${results.length} ${results.length === 1 ? 'resultaat' : 'resultaten'} gevonden`}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="bg-[#111320] rounded-xl h-44 sm:h-52 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-gray-400">Geen games gevonden voor &ldquo;{q}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {results.map((r) => (
            <Link
              key={r.steam_appid}
              to={`/game/${r.steam_appid}`}
              className="block bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-600/15 transition-all duration-200"
            >
              <img
                src={r.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${r.steam_appid}/header.jpg`}
                alt={r.name}
                className="w-full h-24 sm:h-28 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm font-medium text-gray-200 mb-1.5 line-clamp-2">
                  {r.name}
                </p>
                {r.is_in_db && (
                  <span className="text-[10px] sm:text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full">
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
