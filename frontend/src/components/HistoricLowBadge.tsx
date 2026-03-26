import { TrendingDown } from 'lucide-react'

interface Props {
  currentPrice?: number
  historicLowPrice?: number
  historicLowDate?: string
  size?: 'sm' | 'md' | 'lg'
}

export function HistoricLowBadge({ currentPrice, historicLowPrice, historicLowDate, size = 'md' }: Props) {
  // Only show if we have historic low data and current price matches it
  if (!historicLowPrice || !currentPrice) return null

  // Check if current price is at or very close to historic low (within 1 cent)
  const isHistoricLow = Math.abs(currentPrice - historicLowPrice) < 0.02

  if (!isHistoricLow) return null

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  }

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  }

  // Format date if available
  const dateText = historicLowDate
    ? new Date(historicLowDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div
      className={`inline-flex items-center ${sizeClasses[size]} bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold rounded-md shadow-lg animate-pulse`}
      title={dateText ? `Historic Low sinds ${dateText}` : 'Historic Low Prijs!'}
    >
      <TrendingDown size={iconSizes[size]} />
      <span>HISTORIC LOW</span>
    </div>
  )
}
