import { useQuery } from '@tanstack/react-query'
import { getFeaturedDeals } from '../api/games'
import { TrendingDown, Zap, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DealOfTheDay } from '../components/DealOfTheDay'
import { RecentlyViewed } from '../components/RecentlyViewed'

export function HomePage() {
  const { data: featured = [], isLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: getFeaturedDeals,
    staleTime: 1000 * 60 * 15,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
      {/* Hero */}
      <div className="text-center mb-12 sm:mb-16">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-4 leading-tight text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Find the{' '}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            best game deals
          </span>
        </h1>
        <p
          className="text-base sm:text-lg max-w-xl mx-auto mb-6 sm:mb-8 px-4 text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          Compare prices across Steam, GOG, Humble, Fanatical, key resellers and more.
          Set price alerts and never miss a sale.
        </p>
        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {[
            { icon: <TrendingDown size={15} />, label: '30+ stores compared' },
            { icon: <Zap size={15} />, label: 'Live price alerts' },
            { icon: <BarChart2 size={15} />, label: 'Price history charts' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-2 border px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-secondary)'
              }}
            >
              <span className="text-purple-400">{icon}</span>
              <span className="text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deal of the Day */}
      <DealOfTheDay />

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Steam Featured Deals */}
      <section>
        <h2
          className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <TrendingDown size={20} className="text-green-400" />
          Steam Featured Deals
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl h-48 sm:h-56 animate-pulse"
                style={{ backgroundColor: 'var(--bg-card)' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {featured.slice(0, 40).map((game) => (
              <Link
                key={game.steam_appid}
                to={`/game/${game.steam_appid}`}
                className="block border rounded-xl overflow-hidden hover:border-purple-600 hover:-translate-y-0.5 transition-all duration-200"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-secondary)'
                }}
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
                  <p
                    className="text-xs sm:text-sm mb-1 sm:mb-2 truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {game.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-green-400 font-bold text-sm sm:text-base">
                      €{(game.sale_price ?? game.regular_price ?? 0).toFixed(2).replace('.', ',')}
                    </span>
                    {game.regular_price > (game.sale_price ?? game.regular_price) && (
                      <span
                        className="text-xs line-through"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
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
    </div>
  )
}
