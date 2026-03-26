import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCollection, addGameToCollection, removeGameFromCollection, searchGames } from '../api/games'
import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const collectionId = parseInt(id || '0')

  const { data: collection, isLoading } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => getCollection(collectionId),
    enabled: collectionId > 0,
  })

  const addGameMutation = useMutation({
    mutationFn: (steamAppid: string) => addGameToCollection(collectionId, steamAppid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success('Game toegevoegd!')
      setShowAddModal(false)
      setSearchQuery('')
      setSearchResults([])
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Kon game niet toevoegen'
      toast.error(message)
    },
  })

  const removeGameMutation = useMutation({
    mutationFn: (itemId: number) => removeGameFromCollection(collectionId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success('Game verwijderd')
    },
    onError: () => {
      toast.error('Kon game niet verwijderen')
    },
  })

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return

    setSearching(true)
    try {
      const results = await searchGames(searchQuery)
      setSearchResults(results)
    } catch (error) {
      toast.error('Kon niet zoeken')
    } finally {
      setSearching(false)
    }
  }

  const handleAddGame = (steamAppid: string) => {
    addGameMutation.mutate(steamAppid)
  }

  const handleRemoveGame = (itemId: number, gameName: string) => {
    if (confirm(`"${gameName}" verwijderen uit deze collectie?`)) {
      removeGameMutation.mutate(itemId)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-700 rounded" />
          <div className="h-4 w-96 bg-gray-700 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-56 bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>Collectie niet gevonden</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/collections')}
          className="flex items-center gap-2 mb-4 hover:text-purple-400 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={20} />
          Terug naar collecties
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {collection.name}
            </h1>
            {collection.description && (
              <p
                className="text-base sm:text-lg mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {collection.description}
              </p>
            )}
            <p
              className="text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {collection.items.length} {collection.items.length === 1 ? 'game' : 'games'}
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Game Toevoegen</span>
          </button>
        </div>
      </div>

      {/* Games Grid */}
      {collection.items.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-secondary)'
          }}
        >
          <p className="text-lg mb-4">Nog geen games in deze collectie</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Voeg je eerste game toe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {collection.items.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg overflow-hidden hover:border-purple-500 transition-all group"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-secondary)'
              }}
            >
              <Link to={`/game/${item.game.steam_appid}`} className="block relative">
                <img
                  src={item.game.header_image}
                  alt={item.game.name}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <div className="p-3">
                <Link to={`/game/${item.game.steam_appid}`}>
                  <h3
                    className="text-sm font-medium mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.game.name}
                  </h3>
                </Link>

                {item.game.best_price !== undefined && (
                  <p className="text-sm text-green-400 font-semibold mb-2">
                    €{item.game.best_price.toFixed(2).replace('.', ',')}
                  </p>
                )}

                <button
                  onClick={() => handleRemoveGame(item.id, item.game.name)}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 size={12} />
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Game Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg p-6 max-w-2xl w-full border max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <h2
              className="text-xl font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Game Toevoegen
            </h2>

            {/* Search */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Zoek een game..."
                className="flex-1 px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.trim().length < 2}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Search size={20} />
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((game) => (
                  <div
                    key={game.steam_appid}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-purple-500 transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-primary)'
                    }}
                  >
                    {game.header_image && (
                      <img
                        src={game.header_image}
                        alt={game.name}
                        className="w-20 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p
                        className="font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {game.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddGame(game.steam_appid)}
                      disabled={addGameMutation.isPending}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                    >
                      Toevoegen
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searching && (
              <p
                className="text-center py-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                Zoeken...
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                style={{
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)'
                }}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
