import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { PriceHistoryPoint } from '../api/games'
import { useMemo } from 'react'

interface Props {
  history: PriceHistoryPoint[]
}

export function PriceHistoryChart({ history }: Props) {
  const chartData = useMemo(() => {
    const byDate = new Map<string, { lowestPrice: number; storeName: string }>()

    // For each date, find the lowest price across all stores
    for (const h of history) {
      const date = h.recorded_at.split('T')[0]
      const existing = byDate.get(date)

      if (!existing || h.price < existing.lowestPrice) {
        byDate.set(date, { lowestPrice: h.price, storeName: h.store_name })
      }
    }

    const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
    return sorted.map(([date, { lowestPrice }]) => ({ date, price: lowestPrice }))
  }, [history])

  if (chartData.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: '#475569', fontSize: '0.875rem' }}>
        Nog geen prijsgeschiedenis beschikbaar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#1e2235' }}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#1e2235' }}
          tickFormatter={(v) => `€${v}`}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value) => [`€${Number(value).toFixed(2).replace('.', ',')}`, 'Beste Prijs']}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Line
          type="monotone"
          dataKey="price"
          name="Beste Prijs"
          stroke="#34d399"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
