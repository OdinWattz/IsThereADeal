import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { SearchBar } from './SearchBar'
import { Gamepad2, Heart, Bell, LogOut, LogIn, User, Menu, X, Grid3x3, Gift, FolderOpen, TrendingDown } from 'lucide-react'

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  return (
    <nav
      className="border-b sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(190, 232, 252, 0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderColor: 'rgba(90, 175, 225, 0.45)',
        boxShadow: '0 2px 16px rgba(30, 110, 170, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Nav Bar */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg sm:text-xl flex-shrink-0"
            style={{ color: '#0c5a85', textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}
          >
            <Gamepad2 size={26} />
            <span className="hidden sm:inline">GameDeals</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/browse"
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: '#1a4a68' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
            >
              Browse
            </Link>
            <Link
              to="/free"
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              style={{ color: '#1a4a68' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
            >
              <Gift size={16} style={{ color: '#169a58' }} />
              <span>Free</span>
            </Link>

            {isAuthenticated() ? (
              <>
                <Link
                  to="/wishlist"
                  title="Wishlist"
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
                >
                  <Heart size={20} />
                </Link>
                <Link
                  to="/collections"
                  title="Collections"
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
                >
                  <FolderOpen size={20} />
                </Link>
                <Link
                  to="/alerts"
                  title="Price Alerts"
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
                >
                  <Bell size={20} />
                </Link>
                <Link
                  to="/stats"
                  title="Savings Stats"
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
                >
                  <TrendingDown size={20} />
                </Link>
                <div className="flex items-center gap-1 ml-1 pl-2" style={{ borderLeft: '1px solid rgba(90,175,225,0.45)' }}>
                  <Link
                    to="/profile"
                    title="Profile"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: '#1a4a68' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
                  >
                    <User size={20} />
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: '#1a4a68' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#082030' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#1a4a68' }}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all btn-aero"
              >
                <LogIn size={16} />
                <span>Inloggen</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: '#1a4a68' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Search (always visible on mobile) */}
        <div className="md:hidden pb-3">
          <SearchBar />
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-t"
          style={{
            background: 'rgba(215, 244, 255, 0.94)',
            borderColor: 'rgba(90, 175, 225, 0.4)',
          }}
        >
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/browse"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
              style={{ color: '#1a4a68' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Grid3x3 size={20} />
              <span>Browse Games</span>
            </Link>
            <Link
              to="/free"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
              style={{ color: '#1a4a68' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Gift size={20} style={{ color: '#169a58' }} />
              <span>Gratis Games</span>
            </Link>

            {isAuthenticated() ? (
              <>
                <Link
                  to="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Heart size={20} />
                  <span>Verlanglijst</span>
                </Link>
                <Link
                  to="/collections"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <FolderOpen size={20} />
                  <span>Collecties</span>
                </Link>
                <Link
                  to="/alerts"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Bell size={20} />
                  <span>Price Alerts</span>
                </Link>
                <Link
                  to="/stats"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <TrendingDown size={20} />
                  <span>Besparingen</span>
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <User size={20} />
                  <span>Profiel</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-left"
                  style={{ color: '#1a4a68' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={20} />
                  <span>Uitloggen</span>
                </button>
                <div className="pt-2 px-4 text-sm" style={{ color: '#5888a5', borderTop: '1px solid rgba(90,175,225,0.35)' }}>
                  Ingelogd als <span style={{ color: '#082030', fontWeight: 600 }}>{user?.username}</span>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all btn-aero"
              >
                <LogIn size={18} />
                <span>Inloggen</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
