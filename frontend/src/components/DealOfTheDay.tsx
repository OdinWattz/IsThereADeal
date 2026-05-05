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
      <div className="rounded-2xl p-8 mb-8 animate-pulse" style={{ background: 'linear-gradient(135deg, #7ac8e8 0%, #4aa8d8 50%, #2888c0 100%)' }}>
        <div className="h-48 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}></div>
      </div>
    )
  }

  if (!deal) return null

  return (
    <div className="rounded-2xl p-1 mb-8" style={{
      background: 'linear-gradient(135deg, #5ec5e8 0%, #2ea8d8 35%, #1888c0 65%, #0e6eaa 100%)',
      boxShadow: '0 8px 32px rgba(14, 110, 170, 0.35)',
    }}>
      <div className="rounded-xl p-6 md:p-8" style={{
        background: 'rgba(220, 245, 255, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #2ea8d8, #1278a8)', boxShadow: '0 4px 12px rgba(18, 120, 168, 0.35)' }}>
              <Flame size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#0a2038' }}>Deal of the Day</h2>
              <p className="text-sm" style={{ color: '#5888a5' }}>Dagelijks om middernacht vervangen</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg" style={{
            background: 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(90, 175, 225, 0.4)',
            backdropFilter: 'blur(6px)',
          }}>
            <Clock size={18} style={{ color: '#1278a8' }} />
            <div className="flex items-center gap-1 font-mono" style={{ color: '#0a2038' }}>
              <span className="px-2 py-1 rounded" style={{ background: 'rgba(18, 120, 168, 0.12)' }}>{String(timeLeft.hours).padStart(2, '0')}</span>
              <span style={{ color: '#5888a5' }}>:</span>
              <span className="px-2 py-1 rounded" style={{ background: 'rgba(18, 120, 168, 0.12)' }}>{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span style={{ color: '#5888a5' }}>:</span>
              <span className="px-2 py-1 rounded" style={{ background: 'rgba(18, 120, 168, 0.12)' }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Deal Content */}
        <Link to={`/game/${deal.steam_appid}`} className="block group">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Game Image */}
            <div className="md:w-1/2 relative overflow-hidden rounded-xl" style={{ boxShadow: '0 4px 16px rgba(18, 120, 168, 0.2)' }}>
              <img
                src={deal.header_image}
                alt={deal.name}
                className="w-full aspect-[460/215] object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 right-3 text-white text-2xl font-bold px-4 py-2 rounded-lg shadow-lg" style={{
                background: 'linear-gradient(135deg, #1ea866, #15924e)',
                boxShadow: '0 4px 12px rgba(22, 154, 88, 0.4)',
              }}>
                -{deal.discount_percent}%
              </div>
            </div>

            {/* Deal Info */}
            <div className="md:w-1/2 flex flex-col justify-center">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 transition-colors line-clamp-2" style={{ color: '#0a2038' }}>
                {deal.name}
              </h3>

              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-5xl font-bold" style={{ color: '#169a58' }}>
                  ${deal.sale_price.toFixed(2)}
                </span>
                <span className="text-2xl line-through" style={{ color: '#7aabcc' }}>
                  ${deal.regular_price.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3" style={{ color: '#5888a5' }}>
                <span className="text-sm">via {deal.store_name}</span>
                <span className="text-sm">•</span>
                <span className="text-sm">Deal Rating: {deal.deal_rating.toFixed(1)}/10</span>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-lg self-start btn-aero transition-all">
                <span>Bekijk Deal</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>

              {/* Mobile Countdown */}
              <div className="sm:hidden flex items-center gap-2 mt-4 text-sm" style={{ color: '#5888a5' }}>
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
