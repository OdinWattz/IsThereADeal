import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { updateProfile, changePassword, deleteAccount, getWishlist, getAlerts } from '../api/games'
import toast from 'react-hot-toast'
import { User, Lock, Trash2, Heart, Bell, Shield } from 'lucide-react'

export function ProfilePage() {
  const { user, updateUser, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const [editingField, setEditingField] = useState<'username' | 'email' | null>(null)
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => getWishlist(50, 0),
    staleTime: 0,
    gcTime: 0,
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
  })

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser)
      setEditingField(null)
      toast.success('Profile updated!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update profile')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: ({ current, newPwd }: { current: string; newPwd: string }) =>
      changePassword(current, newPwd),
    onSuccess: () => {
      toast.success('Password changed successfully!')
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to change password')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success('Account deleted')
      logout()
      navigate('/')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete account')
    },
  })

  const handleSaveUsername = () => {
    if (username && username !== user?.username) {
      updateMutation.mutate({ username })
    } else {
      setEditingField(null)
    }
  }

  const handleSaveEmail = () => {
    if (email && email !== user?.email) {
      updateMutation.mutate({ email })
    } else {
      setEditingField(null)
    }
  }

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    passwordMutation.mutate({ current: currentPassword, newPwd: newPassword })
  }

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast.error('Please enter your password')
      return
    }
    deleteMutation.mutate(deletePassword)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
          <User size={32} style={{color: 'var(--accent)'}} />
          Profiel
        </h1>
        <p className="text-sm sm:text-base" style={{color: 'var(--text-secondary)'}}>Beheer je account instellingen en voorkeuren</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          to="/wishlist"
          className="rounded-xl p-6 transition-all"
          style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(110,190,235,0.42)', backdropFilter: 'blur(8px)', boxShadow: '0 3px 12px rgba(40,110,165,0.08)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#1480b8'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,190,235,0.42)'}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>Verlanglijst</p>
              <p className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>{wishlistItems.length}</p>
            </div>
            <Heart size={32} style={{color: '#e879a0'}} />
          </div>
        </Link>

        <Link
          to="/alerts"
          className="rounded-xl p-6 transition-all"
          style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(110,190,235,0.42)', backdropFilter: 'blur(8px)', boxShadow: '0 3px 12px rgba(40,110,165,0.08)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#1480b8'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,190,235,0.42)'}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>Price Alerts</p>
              <p className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>{alerts.length}</p>
            </div>
            <Bell size={32} className="text-orange-400" />
          </div>
        </Link>
      </div>

      {/* Profile Info Section */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(90,175,225,0.45)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(50,120,170,0.1)' }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
          <User size={20} />
          Account Informatie
        </h2>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Gebruikersnaam</label>
          {editingField === 'username' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 input-aero px-4 py-2"
                placeholder="Username"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveUsername}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 btn-aero font-medium disabled:opacity-50"
                >
                  Opslaan
                </button>
                <button
                  onClick={() => {
                    setEditingField(null)
                    setUsername(user?.username || '')
                  }}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-secondary)' }}
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'rgba(220,244,255,0.7)', border: '1px solid rgba(90,175,225,0.35)' }}>
              <span style={{color: 'var(--text-primary)'}}>{user?.username}</span>
              <button
                onClick={() => setEditingField('username')}
                className="text-sm font-medium" style={{color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer'}}
              >
                Bewerken
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>E-mail</label>
          {editingField === 'email' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 input-aero px-4 py-2"
                placeholder="Email"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEmail}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 btn-aero font-medium disabled:opacity-50"
                >
                  Opslaan
                </button>
                <button
                  onClick={() => {
                    setEditingField(null)
                    setEmail(user?.email || '')
                  }}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-secondary)' }}
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'rgba(220,244,255,0.7)', border: '1px solid rgba(90,175,225,0.35)' }}>
              <span style={{color: 'var(--text-primary)'}}>{user?.email}</span>
              <button
                onClick={() => setEditingField('email')}
                className="text-sm font-medium" style={{color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer'}}
              >
                Bewerken
              </button>
            </div>
          )}
        </div>

        {/* Member Since */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Lid sinds</label>
          <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(220,244,255,0.7)', border: '1px solid rgba(90,175,225,0.35)' }}>
            <span style={{color: 'var(--text-primary)'}}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(90,175,225,0.45)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(50,120,170,0.1)' }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
          <Lock size={20} />
          Wachtwoord
        </h2>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="px-4 py-2 rounded-lg font-medium"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-secondary)' }}
          >
            Wachtwoord wijzigen
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Huidig wachtwoord</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full input-aero px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Nieuw wachtwoord</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full input-aero px-4 py-2"
                placeholder="Minimaal 6 tekens"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Bevestig nieuw wachtwoord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full input-aero px-4 py-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleChangePassword}
                disabled={passwordMutation.isPending}
                className="px-4 py-2 btn-aero font-medium disabled:opacity-50"
              >
                Wachtwoord wijzigen
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-secondary)' }}
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl p-6" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <Shield size={20} />
          Gevarenzone
        </h2>
        <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
          Het verwijderen van je account is permanent en kan niet ongedaan worden gemaakt. Al je gegevens, inclusief je verlanglijst en alerts, worden verwijderd.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Trash2 size={16} />
          Account verwijderen
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl p-6 max-w-md w-full" style={{ background: 'rgba(235,250,255,0.97)', border: '1px solid rgba(90,175,225,0.5)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(40,100,160,0.2)' }}>
            <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Account verwijderen?</h3>
            <p className="mb-4" style={{color: 'var(--text-secondary)'}}>
              Dit kan niet ongedaan worden gemaakt. Al je gegevens worden permanent verwijderd.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Bevestig je wachtwoord</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full input-aero px-4 py-2"
                placeholder="Wachtwoord"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Ja, verwijder mijn account
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletePassword('')
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(90,175,225,0.45)', color: 'var(--text-secondary)' }}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
