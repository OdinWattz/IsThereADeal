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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <User size={32} className="text-purple-400" />
          Profiel
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">Beheer je account instellingen en voorkeuren</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          to="/wishlist"
          className="bg-[#111320] border border-[#1e2235] rounded-xl p-6 hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Verlanglijst</p>
              <p className="text-3xl font-bold text-white">{wishlistItems.length}</p>
            </div>
            <Heart size={32} className="text-pink-400" />
          </div>
        </Link>

        <Link
          to="/alerts"
          className="bg-[#111320] border border-[#1e2235] rounded-xl p-6 hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Price Alerts</p>
              <p className="text-3xl font-bold text-white">{alerts.length}</p>
            </div>
            <Bell size={32} className="text-orange-400" />
          </div>
        </Link>
      </div>

      {/* Profile Info Section */}
      <div className="bg-[#111320] border border-[#1e2235] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User size={20} />
          Account Informatie
        </h2>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Gebruikersnaam</label>
          {editingField === 'username' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Username"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveUsername}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Opslaan
                </button>
                <button
                  onClick={() => {
                    setEditingField(null)
                    setUsername(user?.username || '')
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#0d0f1a] border border-[#1e2235] rounded-lg px-4 py-3">
              <span className="text-white">{user?.username}</span>
              <button
                onClick={() => setEditingField('username')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                Bewerken
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">E-mail</label>
          {editingField === 'email' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Email"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEmail}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Opslaan
                </button>
                <button
                  onClick={() => {
                    setEditingField(null)
                    setEmail(user?.email || '')
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#0d0f1a] border border-[#1e2235] rounded-lg px-4 py-3">
              <span className="text-white">{user?.email}</span>
              <button
                onClick={() => setEditingField('email')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                Bewerken
              </button>
            </div>
          )}
        </div>

        {/* Member Since */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Lid sinds</label>
          <div className="bg-[#0d0f1a] border border-[#1e2235] rounded-lg px-4 py-3">
            <span className="text-white">
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
      <div className="bg-[#111320] border border-[#1e2235] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock size={20} />
          Wachtwoord
        </h2>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
          >
            Wachtwoord wijzigen
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Huidig wachtwoord</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Nieuw wachtwoord</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Minimaal 6 tekens"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Bevestig nieuw wachtwoord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleChangePassword}
                disabled={passwordMutation.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
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
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <Shield size={20} />
          Gevarenzone
        </h2>
        <p className="text-gray-400 text-sm mb-4">
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
          <div className="bg-[#111320] border border-[#1e2235] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Account verwijderen?</h3>
            <p className="text-gray-400 mb-4">
              Dit kan niet ongedaan worden gemaakt. Al je gegevens worden permanent verwijderd.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Bevestig je wachtwoord</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full bg-[#0d0f1a] border border-[#2a2d3e] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
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
