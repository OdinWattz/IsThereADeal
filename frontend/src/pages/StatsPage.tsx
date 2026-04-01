import { useQuery } from '@tanstack/react-query'
import { getUserSavings } from '../api/games'
import { TrendingDown, DollarSign, Target, Bell, Zap, Percent } from 'lucide-react'
import SEO from '../components/SEO'

export function StatsPage() {
  const { data: savings, isLoading } = useQuery({
    queryKey: ['savings'],
    queryFn: getUserSavings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-lg animate-pulse"
              style={{ backgroundColor: 'var(--bg-card)' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!savings) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>Kon statistieken niet laden</p>
      </div>
    )
  }

  const stats = [
    {
      icon: <TrendingDown size={24} className="text-green-400" />,
      label: 'Totale Besparing',
      value: `€${savings.potential_savings.toFixed(2).replace('.', ',')}`,
      subtitle: `${savings.savings_percentage}% korting`,
      color: 'green',
    },
    {
      icon: <DollarSign size={24} className="text-blue-400" />,
      label: 'Reguliere Prijs',
      value: `€${savings.total_regular_price.toFixed(2).replace('.', ',')}`,
      subtitle: `${savings.total_wishlist_games} games`,
      color: 'blue',
    },
    {
      icon: <Zap size={24} className="text-yellow-400" />,
      label: 'Sale Prijs',
      value: `€${savings.total_sale_price.toFixed(2).replace('.', ',')}`,
      subtitle: `${savings.games_on_sale} games in sale`,
      color: 'yellow',
    },
    {
      icon: <Target size={24} className="text-purple-400" />,
      label: 'Target Bereikt',
      value: `${savings.games_at_target_price}`,
      subtitle: 'games op target prijs',
      color: 'purple',
    },
    {
      icon: <Bell size={24} className="text-orange-400" />,
      label: 'Actieve Alerts',
      value: `${savings.active_alerts}`,
      subtitle: `${savings.recent_alert_triggers} recent getriggerd`,
      color: 'orange',
    },
    {
      icon: <Percent size={24} className="text-pink-400" />,
      label: 'Korting %',
      value: `${savings.savings_percentage}%`,
      subtitle: 'gemiddelde besparing',
      color: 'pink',
    },
  ]

  return (
    <>
      <SEO
        title="Besparingen Dashboard - Zie je Game Deal Statistieken"
        description="Bekijk hoeveel je bespaart met je wishlist en alerts. Real-time statistieken over je game deals en kortingen."
        keywords="game besparingen, deal statistieken, game korting tracker, wishlist stats"
        url="https://serpodin.nl/stats"
      />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingDown size={32} className="text-green-400" />
          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Besparingen Dashboard
          </h1>
        </div>
        <p
          className="text-base sm:text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          Zie hoeveel je bespaart met je verlanglijst
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="border rounded-lg p-6 hover:border-purple-500 transition-all"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-secondary)'
            }}
          >
            <div className="flex items-start justify-between mb-3">
              {stat.icon}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `var(--bg-secondary)`,
                  color: 'var(--text-tertiary)'
                }}
              >
                Live
              </span>
            </div>

            <div className="mb-2">
              <div
                className="text-2xl sm:text-3xl font-bold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {stat.value}
              </div>
              <div
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {stat.label}
              </div>
            </div>

            <div
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {stat.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div
        className="border rounded-lg p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-secondary)'
        }}
      >
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          📊 Samenvatting
        </h2>

        <div className="space-y-3">
          {savings.total_wishlist_games > 0 && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>
                Als je nu al je wishlist games koopt:
              </span>
              <span
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                €{savings.total_sale_price.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {savings.potential_savings > 0 && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>
                Besparing t.o.v. reguliere prijs:
              </span>
              <span className="font-semibold text-green-400">
                -€{savings.potential_savings.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {savings.games_at_target_price > 0 && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>
                Games op target prijs:
              </span>
              <span className="font-semibold text-purple-400">
                {savings.games_at_target_price} 🎯
              </span>
            </div>
          )}

          {savings.total_wishlist_games === 0 && (
            <div className="text-center py-4">
              <p style={{ color: 'var(--text-tertiary)' }}>
                Voeg games toe aan je wishlist om je besparingen te zien!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
