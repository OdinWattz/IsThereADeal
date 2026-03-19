import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { PriceHistoryPoint } from '../api/games'
import { useMemo } from 'react'

interface Props {
  history: PriceHistoryPoint[]
}

const COLORS = [
  '#a78bfa', '#34d399', '#60a5fa', '#f59e0b', '#f87171',
  '#c084fc', '#6ee7b7', '#93c5fd',
]

export function PriceHistoryChart({ history }: Props) {
  const { chartData, stores } = useMemo(() => {
    // Group by date (day) and store
    const byDate = new Map<string, Record<string, number>>()
    const storeSet = new Set<string>()

    for (const h of history) {
      const date = h.recorded_at.split('T')[0]
      storeSet.add(h.store_name)
      if (!byDate.has(date)) byDate.set(date, {})
      byDate.get(date)![h.store_name] = h.price
    }

    const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
    const chartData = sorted.map(([date, prices]) => ({ date, ...prices }))
    return { chartData, stores: [...storeSet] }
  }, [history])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No price history available yet
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
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        {stores.map((store, i) => (
          <Line
            key={store}
            type="monotone"
            dataKey={store}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
