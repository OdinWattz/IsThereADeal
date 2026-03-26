import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCollections, createCollection, deleteCollection, Collection } from '../api/games'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Plus, Trash2, Edit, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export function CollectionsPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [newCollectionPublic, setNewCollectionPublic] = useState(false)

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
  })

  const createMutation = useMutation({
    mutationFn: () => createCollection(newCollectionName, newCollectionDescription, newCollectionPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success('Collectie aangemaakt!')
      setShowCreateModal(false)
      setNewCollectionName('')
      setNewCollectionDescription('')
      setNewCollectionPublic(false)
    },
    onError: () => {
      toast.error('Kon collectie niet aanmaken')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success('Collectie verwijderd')
    },
    onError: () => {
      toast.error('Kon collectie niet verwijderen')
    },
  })

  const handleCreate = () => {
    if (!newCollectionName.trim()) {
      toast.error('Vul een naam in')
      return
    }
    createMutation.mutate()
  }

  const handleDelete = (collection: Collection) => {
    if (confirm(`Weet je zeker dat je "${collection.name}" wilt verwijderen?`)) {
      deleteMutation.mutate(collection.id)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen size={32} className="text-purple-400" />
            <h1
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Collecties
            </h1>
          </div>
          <p
            className="text-base sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Organiseer je games in custom lijsten
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Nieuwe Collectie</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg h-48 animate-pulse"
              style={{ backgroundColor: 'var(--bg-card)' }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && collections.length === 0 && (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-secondary)'
          }}
        >
          <FolderOpen size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg mb-4">Nog geen collecties</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Maak je eerste collectie
          </button>
        </div>
      )}

      {/* Collections Grid */}
      {!isLoading && collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="border rounded-lg p-5 hover:border-purple-500 transition-all group"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-secondary)'
              }}
            >
              {/* Collection Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Link
                    to={`/collections/${collection.id}`}
                    className="flex items-center gap-2 group-hover:text-purple-400 transition-colors"
                  >
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {collection.name}
                    </h3>
                    <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  {collection.description && (
                    <p
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {collection.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(collection)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Verwijderen"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Game Count */}
              <div className="flex items-center justify-between">
                <span
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {collection.items.length} {collection.items.length === 1 ? 'game' : 'games'}
                </span>
                {collection.is_public && (
                  <span className="text-xs px-2 py-0.5 bg-green-600/20 text-green-400 rounded">
                    Publiek
                  </span>
                )}
              </div>

              {/* Preview Images */}
              {collection.items.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-1">
                  {collection.items.slice(0, 3).map((item) => (
                    <img
                      key={item.id}
                      src={item.game.header_image}
                      alt={item.game.name}
                      className="w-full h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg p-6 max-w-md w-full border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <h2
              className="text-xl font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Nieuwe Collectie
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Naam *
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Bijv. Must Play, Backlog, Favorites..."
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Beschrijving
                </label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Optionele beschrijving..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="public"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                  className="w-4 h-4"
                />
                <label
                  htmlFor="public"
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Maak deze collectie publiek zichtbaar
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                style={{
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)'
                }}
              >
                Annuleren
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
