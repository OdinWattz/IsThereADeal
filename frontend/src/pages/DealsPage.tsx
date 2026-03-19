import { useQuery } from '@tanstack/react-query'
import { getDeals } from '../api/games'
import { GameCard } from '../components/GameCard'
import { useState } from 'react'
import { TrendingDown } from 'lucide-react'

export function DealsPage() {
  const [page, setPage] = useState(0)
  const limit = 20

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', page],
    queryFn: () => getDeals(page * limit, limit),
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <TrendingDown size={28} className="text-green-400" />
        All Deals
      </h1>
      <p className="text-slate-400 mb-8">Games currently on sale across all tracked stores</p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="bg-[#13151f] rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <TrendingDown size={48} className="mx-auto mb-4 opacity-30" />
          <p>No deals tracked yet. Search for a game to start tracking prices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {deals.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-3 mt-8">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-[#13151f] border border-[#1e2235] rounded-lg text-sm text-slate-300 disabled:opacity-30 hover:border-purple-500 transition-colors"
        >
          ← Previous
        </button>
        <span className="px-4 py-2 text-sm text-slate-400">Page {page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={deals.length < limit}
          className="px-4 py-2 bg-[#13151f] border border-[#1e2235] rounded-lg text-sm text-slate-300 disabled:opacity-30 hover:border-purple-500 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
