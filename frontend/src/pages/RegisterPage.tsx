import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { register, login } from '../api/games'
import toast from 'react-hot-toast'
import { Gamepad2, UserPlus, Check, X } from 'lucide-react'

function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0

  // Length check
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (password.length >= 14) score += 1

  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  // Map to 0-4 scale: 0-1pts=0, 2-3pts=1, 4pts=2, 5-6pts=3, 7pts=4
  if (score <= 1) score = 0
  else if (score <= 3) score = 1
  else if (score === 4) score = 2
  else if (score <= 6) score = 3
  else score = 4

  const labels = ['', 'Zwak', 'Matig', 'Goed', 'Sterk']
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

  return { score, label: labels[score], color: colors[score] }
}

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password])

  const passwordRequirements = [
    { met: password.length >= 6, label: 'Minimaal 6 tekens' },
    { met: /[A-Z]/.test(password), label: 'Een hoofdletter' },
    { met: /[0-9]/.test(password), label: 'Een cijfer' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(username, email, password)
      const data = await login(username, password)
      setAuth(data.access_token, data.user)
      toast.success('Account created! Welcome 🎮')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Registration failed')
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
          <h1 className="text-2xl font-bold mb-1" style={{color: 'var(--text-primary)'}}>Account aanmaken</h1>
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Volg prijzen en ontvang meldingen bij deals</p>
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
              minLength={3}
              className="w-full input-aero px-3.5 py-2.5 text-sm"
              placeholder="gamelover99"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{color: 'var(--text-secondary)'}}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full input-aero px-3.5 py-2.5 text-sm"
              placeholder="jij@voorbeeld.nl"
            />
          </div>

          {/* Password with Strength Indicator */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{color: 'var(--text-secondary)'}}>
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full input-aero px-3.5 py-2.5 text-sm"
              placeholder="min. 6 tekens"
            />

            {/* Password Strength Bar */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : 'bg-[rgba(160,210,240,0.5)]'
                      }`}
                    />
                  ))}
                </div>
                {passwordStrength.label && (
                  <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                    Sterkte: <span className="font-medium">{passwordStrength.label}</span>
                  </p>
                )}
              </div>
            )}

            {/* Requirements Checklist */}
            {password && (
              <div className="mt-3 space-y-1.5">
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <X size={14} style={{color: '#8cbfd8'}} />
                    )}
                    <span className={req.met ? 'text-green-500' : ''} style={!req.met ? {color: 'var(--text-tertiary)'} : {}}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 btn-aero font-medium text-sm mt-6"
          >
            <UserPlus size={16} />
            {loading ? 'Aanmaken...' : 'Account aanmaken'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm" style={{color: 'var(--text-secondary)'}}>
          Al een account?{' '}
          <Link to="/login" className="transition-colors" style={{color: 'var(--accent)'}}>
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  )
}
