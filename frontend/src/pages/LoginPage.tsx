import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { login } from '../api/games'
import toast from 'react-hot-toast'
import { Gamepad2, LogIn } from 'lucide-react'

const REMEMBER_ME_KEY = 'remembered_username'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  // Load remembered username on mount
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_ME_KEY)
    if (remembered) {
      setUsername(remembered)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(username, password)
      setAuth(data.access_token, data.user)

      // Save or clear remembered username
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, username)
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY)
      }

      toast.success(`Welcome back, ${data.user.username}!`)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex p-3.5 bg-purple-600/15 rounded-full mb-3">
            <Gamepad2 size={32} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welkom terug</h1>
          <p className="text-gray-400 text-sm">Log in om je verlanglijst en alerts te bekijken</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111320] border border-[#1e2235] rounded-2xl p-6 sm:p-7 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
              Gebruikersnaam
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-[#1e2235] border border-[#2a2d3e] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="jouw_naam"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#1e2235] border border-[#2a2d3e] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-[#1e2235] text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400 cursor-pointer select-none">
              Gebruikersnaam onthouden
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm transition-colors mt-6"
          >
            <LogIn size={16} />
            {loading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-400">
          Nog geen account?{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
            Aanmaken
          </Link>
        </p>
      </div>
    </div>
  )
}
