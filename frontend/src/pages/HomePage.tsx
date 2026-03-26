import { useQuery } from '@tanstack/react-query'
import { getFeaturedDeals, getDeals, type TrendingDeal } from '../api/games'
import { TrendingDown, Zap, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
      {/* Hero */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 sm:mb-4 leading-tight">
          Find the{' '}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            best game deals
          </span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-6 sm:mb-8 px-4">
          Compare prices across Steam, GOG, Humble, Fanatical, key resellers and more.
          Set price alerts and never miss a sale.
        </p>
        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {[
            { icon: <TrendingDown size={15} />, label: '30+ stores' },
            { icon: <Zap size={15} />, label: 'Live alerts' },
            { icon: <BarChart2 size={15} />, label: 'Price history' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-[#111320] border border-[#1e2235] px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm text-gray-400">
              <span className="text-purple-400">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steam Featured Deals */}
      <section className="mb-10 sm:mb-14">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-5 flex items-center gap-2">
          <TrendingDown size={20} className="text-green-400" />
          Steam Featured Deals
        </h2>
        {featuredLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-[#111320] rounded-xl h-48 sm:h-56 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {featured.slice(0, 40).map((game) => (
              <Link
                key={game.steam_appid}
                to={`/game/${game.steam_appid}`}
                className="block bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-600 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="relative">
                  <img
                    src={game.header_image}
                    alt={game.name}
                    className="w-full h-24 sm:h-28 object-cover"
                  />
                  {game.discount_percent > 0 && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                      -{game.discount_percent}%
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-gray-200 mb-1 sm:mb-2 truncate">
                    {game.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-green-400 font-bold text-sm sm:text-base">
                      €{(game.sale_price ?? game.regular_price ?? 0).toFixed(2).replace('.', ',')}
                    </span>
                    {game.regular_price > (game.sale_price ?? game.regular_price) && (
                      <span className="text-xs text-gray-500 line-through">
                        €{game.regular_price.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Best Deals Right Now */}
      {dbDeals.length > 0 && (
        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-5 flex items-center gap-2">
            <Zap size={20} className="text-purple-400" />
            Best Deals Right Now
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {dealsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-[#111320] rounded-xl h-48 sm:h-56 animate-pulse" />
                ))
              : dbDeals.map((d: TrendingDeal) => (
                  <Link
                    key={`${d.steam_appid}-${d.store_name}`}
                    to={`/game/${d.steam_appid}`}
                    className="block bg-[#111320] border border-[#1e2235] rounded-xl overflow-hidden hover:border-purple-600 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="relative">
                      <img
                        src={d.header_image}
                        alt={d.name}
                        className="w-full h-24 sm:h-28 object-cover"
                      />
                      {d.discount_percent > 0 && (
                        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                          -{d.discount_percent}%
                        </div>
                      )}
                      {d.store_name && d.store_name !== 'Steam' && (
                        <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {d.store_name}
                        </div>
                      )}
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-gray-200 mb-1 sm:mb-2 truncate">
                        {d.name}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-green-400 font-bold text-sm sm:text-base">
                          ${d.sale_price.toFixed(2)}
                        </span>
                        {d.regular_price > d.sale_price && (
                          <span className="text-xs text-gray-500 line-through">
                            ${d.regular_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
      )}
    </div>
  )
}
