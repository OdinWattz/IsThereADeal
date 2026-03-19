import type { GamePrice } from '../api/games'
import { ExternalLink, Key } from 'lucide-react'

interface Props {
  prices: GamePrice[]
}

const STORE_LOGOS: Record<string, string> = {
  steam: '🎮',
  gog: '🌌',
  humble: '🙏',
  fanatical: '🔥',
  epic: '⚡',
  g2a: '🔑',
  eneba: '🔑',
  kinguin: '🔑',
}

function getStoreLogo(storeName: string) {
  const key = storeName.toLowerCase().replace(/[^a-z]/g, '')
  for (const [k, v] of Object.entries(STORE_LOGOS)) {
    if (key.includes(k)) return v
  }
  return '🛒'
}

export function PriceTable({ prices }: Props) {
  const official = prices.filter((p) => !p.is_key_reseller)
  const resellers = prices.filter((p) => p.is_key_reseller)

  const renderRow = (p: GamePrice, i: number) => {
    const displayPrice = p.sale_price ?? p.regular_price
    return (
      <tr
        key={i}
        className={`border-b border-[#1e2235] hover:bg-[#1a1d2e] transition-colors ${
          i === 0 ? 'bg-green-900/10' : ''
        }`}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStoreLogo(p.store_name)}</span>
            <span className="text-sm text-slate-200">{p.store_name}</span>
            {p.is_key_reseller && (
              <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">
                <Key size={10} /> key
              </span>
            )}
            {i === 0 && (
              <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">
                best deal
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-center">
          {p.regular_price != null ? (
            <span className={`text-sm ${p.is_on_sale ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
              ${p.regular_price.toFixed(2)}
            </span>
          ) : (
            <span className="text-slate-500 text-sm">—</span>
          )}
        </td>
        <td className="py-3 px-4 text-center">
          {p.discount_percent > 0 ? (
            <span className="text-xs font-bold text-white bg-green-600 px-2 py-1 rounded">
              -{p.discount_percent}%
            </span>
          ) : (
            <span className="text-slate-600 text-sm">—</span>
          )}
        </td>
        <td className="py-3 px-4 text-right">
          {displayPrice != null ? (
            <span className={`font-bold ${p.is_on_sale ? 'text-green-400' : 'text-slate-200'}`}>
              ${displayPrice.toFixed(2)}
            </span>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </td>
        <td className="py-3 px-4 text-right">
          {p.url ? (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Buy <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-slate-600 text-xs">N/A</span>
          )}
        </td>
      </tr>
    )
  }

  const sortedOfficial = [...official].sort(
    (a, b) => (a.sale_price ?? a.regular_price ?? 999) - (b.sale_price ?? b.regular_price ?? 999)
  )
  const sortedResellers = [...resellers].sort(
    (a, b) => (a.sale_price ?? 999) - (b.sale_price ?? 999)
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1e2235]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#1e2235] bg-[#0f1117]">
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Store</th>
            <th className="py-3 px-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Regular</th>
            <th className="py-3 px-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Discount</th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Link</th>
          </tr>
        </thead>
        <tbody>
          {sortedOfficial.map(renderRow)}
          {resellers.length > 0 && (
            <>
              <tr className="bg-[#0f1117]">
                <td colSpan={5} className="py-2 px-4 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  🔑 Key Resellers (unofficial)
                </td>
              </tr>
              {sortedResellers.map((p, i) => renderRow(p, sortedOfficial.length + i))}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
