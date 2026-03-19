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

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#1e2235', border: '1px solid #2a2d3e', borderRadius: '8px',
    padding: '10px 14px', color: '#fff', fontSize: '0.875rem', outline: 'none',
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', padding: '14px', backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: '50%', marginBottom: '12px' }}>
            <Gamepad2 size={32} color="#a78bfa" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Welkom terug</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Log in om je verlanglijst en alerts te bekijken</p>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: '#111320', border: '1px solid #1e2235', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>Gebruikersnaam</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={inputStyle} placeholder="jouw_naam" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>Wachtwoord</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '11px', backgroundColor: '#7c3aed', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 500, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '4px' }}
          >
            <LogIn size={16} /> {loading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.875rem', color: '#64748b' }}>
          Nog geen account?{' '}
          <Link to="/register" style={{ color: '#a78bfa', textDecoration: 'none' }}>Aanmaken</Link>
        </p>
      </div>
    </div>
  )
}
