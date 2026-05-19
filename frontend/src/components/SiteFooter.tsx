import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t" style={{ borderColor: 'rgba(90,175,225,0.35)', background: 'rgba(190,232,252,0.42)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Serpodin</p>
          <p>Prijzen, alerts en affiliate-links kunnen worden gebruikt om deze dienst te financieren.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Link to="/affiliate-disclosure" className="hover:underline">Affiliate disclosure</Link>
          <Link to="/privacy" className="hover:underline">Privacyverklaring</Link>
        </div>
      </div>
    </footer>
  )
}
