import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Flame, Clock } from 'lucide-react'
import api from '../api/client'

interface DealOfDay {
  steam_appid: string
  name: string
  sale_price: number
  regular_price: number
  discount_percent: number
  store_name: string
  header_image: string
  deal_rating: number
}

export function DealOfTheDay() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal-of-the-day'],
    queryFn: async () => {
      const response = await api.get<DealOfDay>('/games/deal-of-the-day')
      return response.data
    },
    staleTime: 1000 * 60 * 30, // 30 minutes (deal changes at midnight anyway)
  })

  // Countdown to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)

      const diff = midnight.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-8 mb-8 animate-pulse">
        <div className="h-48 bg-black/20 rounded-xl"></div>
      </div>
    )
  }

  if (!deal) return null

  return (
    <div className="bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 rounded-2xl p-1 mb-8 shadow-2xl">
      <div className="bg-[#0a0c14] rounded-xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl">
              <Flame size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Deal of the Day</h2>
              <p className="text-gray-400 text-sm">Dagelijks om middernacht vervangen</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="hidden sm:flex items-center gap-2 bg-black/30 px-4 py-2 rounded-lg border border-white/10">
            <Clock size={18} className="text-orange-400" />
            <div className="flex items-center gap-1 font-mono text-white">
              <span className="bg-white/10 px-2 py-1 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span>:</span>
              <span className="bg-white/10 px-2 py-1 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span>:</span>
              <span className="bg-white/10 px-2 py-1 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Deal Content */}
        <Link to={`/game/${deal.steam_appid}`} className="block group">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Game Image */}
            <div className="md:w-1/2 relative overflow-hidden rounded-xl">
              <img
                src={deal.header_image}
                alt={deal.name}
                className="w-full aspect-[460/215] object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 right-3 bg-green-600 text-white text-2xl font-bold px-4 py-2 rounded-lg shadow-lg">
                -{deal.discount_percent}%
              </div>
            </div>

            {/* Deal Info */}
            <div className="md:w-1/2 flex flex-col justify-center">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors line-clamp-2">
                {deal.name}
              </h3>

              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-5xl font-bold text-green-400">
                  ${deal.sale_price.toFixed(2)}
                </span>
                <span className="text-2xl text-gray-500 line-through">
                  ${deal.regular_price.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-sm">via {deal.store_name}</span>
                <span className="text-sm">•</span>
                <span className="text-sm">Deal Rating: {deal.deal_rating.toFixed(1)}/10</span>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg group-hover:from-orange-600 group-hover:to-red-600 transition-all self-start">
                <span>Bekijk Deal</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>

              {/* Mobile Countdown */}
              <div className="sm:hidden flex items-center gap-2 mt-4 text-gray-400 text-sm">
                <Clock size={16} />
                <span>Vernieuwt over {timeLeft.hours}u {timeLeft.minutes}m {timeLeft.seconds}s</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
