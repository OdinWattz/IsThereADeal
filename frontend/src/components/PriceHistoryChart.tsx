import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { PriceHistoryPoint } from '../api/games'
import { useMemo, useState } from 'react'

interface Props {
  history: PriceHistoryPoint[]
}

const COLORS = [
  '#34d399', '#a78bfa', '#60a5fa', '#f59e0b', '#f87171',
  '#c084fc', '#6ee7b7', '#93c5fd', '#fbbf24', '#fb923c',
]

// Custom tooltip to show store name for best price view
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div style={{
        background: 'rgba(225, 245, 255, 0.96)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(90, 175, 225, 0.5)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 8px 20px rgba(30, 100, 160, 0.15)',
      }}>
        <p style={{ color: '#5888a5', margin: 0, fontSize: '0.75rem', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#169a58', margin: 0, fontWeight: 600 }}>
          €{Number(payload[0].value).toFixed(2).replace('.', ',')}
        </p>
        {data.storeName && (
          <p style={{ color: '#7aabcc', margin: 0, fontSize: '0.7rem', marginTop: '2px' }}>
            via {data.storeName}
          </p>
        )}
      </div>
    )
  }
  return null
}

export function PriceHistoryChart({ history }: Props) {
  const [showAllStores, setShowAllStores] = useState(false)

  const { bestPriceData, allStoresData, stores } = useMemo(() => {
    // Best price view: one line with lowest price per day + store name in tooltip
    const byDateBest = new Map<string, { lowestPrice: number; storeName: string }>()

    for (const h of history) {
      const date = h.recorded_at.split('T')[0]
      const existing = byDateBest.get(date)

      if (!existing || h.price < existing.lowestPrice) {
        byDateBest.set(date, { lowestPrice: h.price, storeName: h.store_name })
      }
    }

    const sortedBest = [...byDateBest.entries()].sort(([a], [b]) => a.localeCompare(b))
    const bestPriceData = sortedBest.map(([date, { lowestPrice, storeName }]) => ({
      date,
      price: lowestPrice,
      storeName
    }))

    // All stores view: one line per store
    const byDateStore = new Map<string, Record<string, number>>()
    const storeSet = new Set<string>()

    for (const h of history) {
      const date = h.recorded_at.split('T')[0]
      storeSet.add(h.store_name)
      if (!byDateStore.has(date)) byDateStore.set(date, {})
      byDateStore.get(date)![h.store_name] = h.price
    }

    const sortedAll = [...byDateStore.entries()].sort(([a], [b]) => a.localeCompare(b))
    const allStoresData = sortedAll.map(([date, prices]) => ({ date, ...prices }))

    return { bestPriceData, allStoresData, stores: [...storeSet] }
  }, [history])

  const chartData = showAllStores ? allStoresData : bestPriceData

  if (chartData.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: '#5888a5', fontSize: '0.875rem' }}>
        Nog geen prijsgeschiedenis beschikbaar
      </div>
    )
  }

  return (
    <div>
      {/* Toggle Button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowAllStores(!showAllStores)}
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{
            background: 'rgba(255,255,255,0.7)',
            borderColor: 'rgba(90, 175, 225, 0.4)',
            color: '#2b5b7a',
          }}
        >
          {showAllStores ? '📊 Toon Beste Prijs' : '🏪 Toon Alle Winkels'}
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90, 175, 225, 0.3)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#5888a5', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(90, 175, 225, 0.4)' }}
          />
          <YAxis
            tick={{ fill: '#5888a5', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(90, 175, 225, 0.4)' }}
            tickFormatter={(v) => `€${v}`}
          />
          <Tooltip
            content={showAllStores ? undefined : <CustomTooltip />}
            contentStyle={showAllStores ? { background: 'rgba(225, 245, 255, 0.96)', border: '1px solid rgba(90, 175, 225, 0.5)', borderRadius: 8, backdropFilter: 'blur(8px)' } : undefined}
            labelStyle={showAllStores ? { color: '#5888a5' } : undefined}
            formatter={showAllStores ? (value, name) => [`€${Number(value).toFixed(2).replace('.', ',')}`, name] : undefined}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#5888a5' }} />

          {showAllStores ? (
            stores.map((store, i) => (
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
            ))
          ) : (
            <Line
              type="monotone"
              dataKey="price"
              name="Beste Prijs"
              stroke="#1278a8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
