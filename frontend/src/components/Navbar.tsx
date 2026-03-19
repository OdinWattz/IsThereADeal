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
    <nav className="bg-[#13151f] border-b border-[#1e2235] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-purple-400 font-bold text-xl shrink-0">
          <Gamepad2 size={24} />
          <span className="hidden sm:inline">GameDeals</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl">
          <SearchBar />
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            to="/deals"
            className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[#1e2235] transition-colors hidden md:block"
          >
            Deals
          </Link>

          {isAuthenticated() ? (
            <>
              <Link
                to="/wishlist"
                className="p-2 rounded-lg text-slate-300 hover:text-purple-400 hover:bg-[#1e2235] transition-colors"
                title="Wishlist"
              >
                <Heart size={20} />
              </Link>
              <Link
                to="/alerts"
                className="p-2 rounded-lg text-slate-300 hover:text-yellow-400 hover:bg-[#1e2235] transition-colors"
                title="Price Alerts"
              >
                <Bell size={20} />
              </Link>
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#1e2235]">
                <span className="text-sm text-slate-400 hidden md:block">{user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#1e2235] transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/login"
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[#1e2235] transition-colors"
              >
                <LogIn size={16} />
                Login
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                <User size={16} />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
