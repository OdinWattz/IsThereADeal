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
          <div className="inline-flex p-3.5 rounded-full mb-3" style={{background: 'rgba(20,128,184,0.12)'}}>
            <Gamepad2 size={32} style={{color: '#1480b8'}} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{color: 'var(--text-primary)'}}>Welkom terug</h1>
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Log in om je verlanglijst en alerts te bekijken</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-6 sm:p-7 space-y-4" style={{background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(90,175,225,0.45)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 24px rgba(50,120,170,0.12)'}}>
          {/* Username */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{color: 'var(--text-secondary)'}}>
              Gebruikersnaam
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full input-aero px-3.5 py-2.5 text-sm"
              placeholder="jouw_naam"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{color: 'var(--text-secondary)'}}>
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full input-aero px-3.5 py-2.5 text-sm"
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
              className="w-4 h-4 rounded cursor-pointer accent-[#1480b8]"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm cursor-pointer select-none" style={{color: 'var(--text-secondary)'}}>
              Gebruikersnaam onthouden
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 btn-aero font-medium text-sm mt-6"
          >
            <LogIn size={16} />
            {loading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm" style={{color: 'var(--text-secondary)'}}>
          Nog geen account?{' '}
          <Link to="/register" className="transition-colors" style={{color: 'var(--accent)'}}>
            Aanmaken
          </Link>
        </p>
      </div>
    </div>
  )
}
