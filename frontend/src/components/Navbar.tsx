import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { SearchBar } from './SearchBar'
import { Gamepad2, Heart, Bell, LogOut, LogIn, User, Menu, X } from 'lucide-react'

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
    <nav className="bg-[#0d0f1a] border-b border-[#1a1d2e] sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Nav Bar */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-purple-400 font-bold text-lg sm:text-xl flex-shrink-0"
          >
            <Gamepad2 size={26} />
            <span className="hidden sm:inline">GameDeals</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/deals"
              className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1a1d2e] transition-colors"
            >
              Deals
            </Link>

            {isAuthenticated() ? (
              <>
                <Link
                  to="/wishlist"
                  title="Wishlist"
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1d2e] transition-colors"
                >
                  <Heart size={20} />
                </Link>
                <Link
                  to="/alerts"
                  title="Price Alerts"
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1d2e] transition-colors"
                >
                  <Bell size={20} />
                </Link>
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-[#1a1d2e]">
                  <Link
                    to="/profile"
                    title="Profile"
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1d2e] transition-colors"
                  >
                    <User size={20} />
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1d2e] transition-colors"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <LogIn size={16} />
                <span>Inloggen</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
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
        <div className="md:hidden bg-[#111320] border-t border-[#1a1d2e]">
          <div className="px-4 py-3 space-y-2">
            <Link
              to="/deals"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d2e] transition-colors"
            >
              Deals
            </Link>

            {isAuthenticated() ? (
              <>
                <Link
                  to="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d2e] transition-colors"
                >
                  <Heart size={20} />
                  <span>Verlanglijst</span>
                </Link>
                <Link
                  to="/alerts"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d2e] transition-colors"
                >
                  <Bell size={20} />
                  <span>Price Alerts</span>
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d2e] transition-colors"
                >
                  <User size={20} />
                  <span>Profiel</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d2e] transition-colors text-left"
                >
                  <LogOut size={20} />
                  <span>Uitloggen</span>
                </button>
                <div className="pt-2 px-4 text-sm text-gray-500 border-t border-[#1a1d2e]">
                  Ingelogd als <span className="text-gray-300">{user?.username}</span>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
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
