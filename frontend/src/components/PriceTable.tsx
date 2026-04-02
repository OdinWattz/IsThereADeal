import type { GamePrice } from '../api/games'
import { ExternalLink, Key, Search } from 'lucide-react'

interface Props {
  prices: GamePrice[]
  gameName?: string
}

const STORE_LOGOS: Record<string, string> = {
  steam: '🎮', gog: '🌌', humble: '🙏', fanatical: '🔥',
  epic: '⚡', g2a: '🔑', eneba: '🔑', kinguin: '🔑',
}

function getStoreLogo(storeName: string) {
  const key = storeName.toLowerCase().replace(/[^a-z]/g, '')
  for (const [k, v] of Object.entries(STORE_LOGOS)) {
    if (key.includes(k)) return v
  }
  return '🛒'
}

const fmt = (val?: number | null) =>
  val != null ? `€${val.toFixed(2).replace('.', ',')}` : null

const GREY_MARKET_SITES = [
  {
    name: 'G2A',
    icon: '🔑',
    url: (q: string) => `https://www.g2a.com/search?query=${encodeURIComponent(q)}`,
  },
  {
    name: 'Kinguin',
    icon: '🔑',
    url: (q: string) => `https://www.kinguin.net/catalogsearch/result/?q=${encodeURIComponent(q)}`,
  },
  {
    name: 'Eneba',
    icon: '🔑',
    url: (q: string) => `https://www.eneba.com/search/?q=${encodeURIComponent(q)}`,
  },
  {
    name: 'AllKeyShop',
    icon: '🔑',
    url: (q: string) => `https://www.allkeyshop.com/blog/buy-${q.toLowerCase().replace(/\s+/g, '-')}-cd-key-compare-prices/`,
  },
]

export function PriceTable({ prices, gameName }: Props) {
  const official = prices.filter((p) => !p.is_key_reseller)
  const resellers = prices.filter((p) => p.is_key_reseller)

  const sortedOfficial = [...official].sort(
    (a, b) => (a.sale_price ?? a.regular_price ?? 999) - (b.sale_price ?? b.regular_price ?? 999)
  )
  const sortedResellers = [...resellers].sort(
    (a, b) => (a.sale_price ?? 999) - (b.sale_price ?? 999)
  )

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    backgroundColor: '#050505',
    whiteSpace: 'nowrap',
  }

  const renderRow = (p: GamePrice, i: number, isBest: boolean) => {
    const displayPrice = p.sale_price ?? p.regular_price
    return (
      <tr
        key={i}
        style={{ borderBottom: '1px solid #222222', backgroundColor: isBest ? 'rgba(22,163,74,0.06)' : 'transparent' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a1a1a')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = isBest ? 'rgba(22,163,74,0.06)' : 'transparent')}
      >
        {/* Store */}
        <td style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>{getStoreLogo(p.store_name)}</span>
            <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{p.store_name}</span>
            {p.is_key_reseller && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: '#fbbf24', backgroundColor: 'rgba(217,119,6,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                <Key size={9} /> key
              </span>
            )}
            {isBest && (
              <span style={{ fontSize: '0.7rem', color: '#4ade80', backgroundColor: 'rgba(22,163,74,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                beste deal
              </span>
            )}
          </div>
        </td>
        {/* Regular */}
        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
          {p.regular_price != null ? (
            <span style={{ fontSize: '0.875rem', color: p.is_on_sale ? '#475569' : '#e2e8f0', textDecoration: p.is_on_sale ? 'line-through' : 'none' }}>
              {fmt(p.regular_price)}
            </span>
          ) : (
            <span style={{ color: '#334155', fontSize: '0.875rem' }}>—</span>
          )}
        </td>
        {/* Discount */}
        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
          {p.discount_percent > 0 ? (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', backgroundColor: '#16a34a', padding: '3px 8px', borderRadius: '5px' }}>
              -{p.discount_percent}%
            </span>
          ) : (
            <span style={{ color: '#334155', fontSize: '0.875rem' }}>—</span>
          )}
        </td>
        {/* Sale price */}
        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
          {displayPrice != null ? (
            <span style={{ fontWeight: 700, fontSize: '1rem', color: p.is_on_sale ? '#4ade80' : '#e2e8f0' }}>
              {fmt(displayPrice)}
            </span>
          ) : (
            <span style={{ color: '#334155' }}>—</span>
          )}
        </td>
        {/* Buy link */}
        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
          {p.url ? (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#a78bfa', backgroundColor: 'rgba(124,58,237,0.15)', padding: '5px 12px', borderRadius: '6px', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.15)')}
            >
              Kopen <ExternalLink size={11} />
            </a>
          ) : (
            <span style={{ color: '#334155', fontSize: '0.75rem' }}>N/A</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #222222' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #222222' }}>
            <th style={{ ...thStyle, textAlign: 'left' }}>Winkel</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Normaal</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Korting</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Prijs</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Link</th>
          </tr>
        </thead>
        <tbody>
          {sortedOfficial.map((p, i) => renderRow(p, i, i === 0))}
          {resellers.length > 0 && (
            <>
              <tr style={{ backgroundColor: '#050505', borderBottom: '1px solid #222222' }}>
                <td colSpan={5} style={{ padding: '8px 16px', fontSize: '0.7rem', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  🔑 Key Resellers (niet-officieel)
                </td>
              </tr>
              {sortedResellers.map((p, i) => renderRow(p, sortedOfficial.length + i, false))}
            </>
          )}
        </tbody>
      </table>
      {gameName && (
        <div style={{ borderTop: '1px solid #222222', padding: '12px 16px', backgroundColor: '#050505' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            🔑 Zoek op grey-market key sites
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {GREY_MARKET_SITES.map((site) => (
              <a
                key={site.name}
                href={site.url(gameName)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#fbbf24', backgroundColor: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.25)', padding: '5px 12px', borderRadius: '6px', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(217,119,6,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(217,119,6,0.12)')}
              >
                {site.icon} {site.name} <Search size={10} />
              </a>
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.68rem', color: '#475569' }}>
            Let op: key resellers zijn geen officiële winkels. Koop enkel bij betrouwbare verkopers.
          </p>
        </div>
      )}
    </div>
  )
}
