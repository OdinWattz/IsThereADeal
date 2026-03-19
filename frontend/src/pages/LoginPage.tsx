import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { login } from '../api/games'
import toast from 'react-hot-toast'
import { Gamepad2, LogIn } from 'lucide-react'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(username, password)
      setAuth(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.username}!`)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-purple-600/20 rounded-full">
              <Gamepad2 size={32} className="text-purple-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1">Sign in to access your wishlist and alerts</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#13151f] border border-[#1e2235] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-[#1e2235] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder-slate-600"
              placeholder="your_username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#1e2235] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder-slate-600"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 mt-2"
          >
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-slate-400">
          No account?{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
