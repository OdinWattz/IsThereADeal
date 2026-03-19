import { useQuery } from '@tanstack/react-query'
import { getFeaturedDeals, getDeals } from '../api/games'
import { GameCard } from '../components/GameCard'
import { TrendingDown, Zap, BarChart2 } from 'lucide-react'

export function HomePage() {
  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeaturedDeals,
    staleTime: 1000 * 60 * 15,
  })

  const { data: dbDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => getDeals(0, 12),
    staleTime: 1000 * 60 * 10,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Find the <span className="text-purple-400">best game deals</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Compare prices across Steam, GOG, Humble, Fanatical, key resellers and more.
          Set price alerts and never miss a sale.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {[
          { icon: <TrendingDown size={16} />, label: '30+ stores compared' },
          { icon: <Zap size={16} />, label: 'Live price alerts' },
          { icon: <BarChart2 size={16} />, label: 'Price history charts' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-2 bg-[#13151f] border border-[#1e2235] px-4 py-2 rounded-full text-sm text-slate-300">
            <span className="text-purple-400">{icon}</span>
            {label}
          </div>
        ))}
      </div>

      {/* Steam Featured Deals */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingDown size={20} className="text-green-400" />
          Steam Featured Deals
        </h2>
        {featuredLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-[#13151f] rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {featured.slice(0, 10).map((game) => (
              <a
                key={game.steam_appid}
                href={`/game/${game.steam_appid}`}
                className="group bg-[#13151f] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
              >
                <div className="relative">
                  <img src={game.header_image} alt={game.name} className="w-full h-36 object-cover" />
                  {game.discount_percent > 0 && (
                    <div className="absolute top-2 left-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-md">
                      -{game.discount_percent}%
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm text-slate-200 line-clamp-1 mb-1 group-hover:text-purple-300 transition-colors">
                    {game.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-green-400 font-bold">
                      ${(game.sale_price ?? game.regular_price ?? 0).toFixed(2)}
                    </span>
                    {game.regular_price > (game.sale_price ?? game.regular_price) && (
                      <span className="text-xs text-slate-500 line-through">
                        ${game.regular_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* DB Tracked Deals */}
      {dbDeals.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={20} className="text-purple-400" />
            Tracked Deals (All Stores)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {dealsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-[#13151f] rounded-xl h-48 animate-pulse" />
                ))
              : dbDeals.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        </section>
      )}
    </div>
  )
}
