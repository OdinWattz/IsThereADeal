import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { SearchBar } from './SearchBar'
import { Gamepad2, Heart, Bell, LogOut, LogIn, User } from 'lucide-react'

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav style={{ backgroundColor: '#0d0f1a', borderBottom: '1px solid #1a1d2e', position: 'sticky', top: 0, zIndex: 50, width: '100%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontWeight: 700, fontSize: '1.2rem', textDecoration: 'none', flexShrink: 0 }}>
          <Gamepad2 size={26} />
          <span>GameDeals</span>
        </Link>

        {/* Search – takes remaining space */}
        <div style={{ flex: 1, maxWidth: '520px' }}>
          <SearchBar />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <Link
            to="/deals"
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.875rem', color: '#94a3b8', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            Deals
          </Link>

          {isAuthenticated() ? (
            <>
              <Link to="/wishlist" title="Wishlist" style={{ padding: '8px', borderRadius: '8px', color: '#94a3b8', display: 'flex' }}>
                <Heart size={20} />
              </Link>
              <Link to="/alerts" title="Price Alerts" style={{ padding: '8px', borderRadius: '8px', color: '#94a3b8', display: 'flex' }}>
                <Bell size={20} />
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', paddingLeft: '12px', borderLeft: '1px solid #1a1d2e' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{user?.username}</span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  style={{ padding: '8px', borderRadius: '8px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
              <Link
                to="/login"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.875rem', color: '#94a3b8', textDecoration: 'none' }}
              >
                <LogIn size={15} /> Login
              </Link>
              <Link
                to="/register"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', backgroundColor: '#7c3aed', color: '#fff', textDecoration: 'none', fontWeight: 500 }}
              >
                <User size={15} /> Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
