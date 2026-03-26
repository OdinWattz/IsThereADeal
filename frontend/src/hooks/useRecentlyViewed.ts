import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'recently_viewed_games'
const MAX_ITEMS = 12

interface RecentlyViewedGame {
  steam_appid: string
  name: string
  header_image: string
  viewed_at: number
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedGame[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyViewedGame[]
        // Sort by most recent
        setRecentlyViewed(parsed.sort((a, b) => b.viewed_at - a.viewed_at))
      }
    } catch (error) {
      console.error('Failed to load recently viewed:', error)
    }
  }, [])

  const addToRecentlyViewed = useCallback((game: { steam_appid: string; name: string; header_image?: string }) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      let existing: RecentlyViewedGame[] = stored ? JSON.parse(stored) : []

      // Remove if already exists
      existing = existing.filter((g) => g.steam_appid !== game.steam_appid)

      // Add to front
      const newGame: RecentlyViewedGame = {
        steam_appid: game.steam_appid,
        name: game.name,
        header_image: game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steam_appid}/header.jpg`,
        viewed_at: Date.now(),
      }

      existing.unshift(newGame)

      // Keep only MAX_ITEMS
      existing = existing.slice(0, MAX_ITEMS)

      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
      setRecentlyViewed(existing)
    } catch (error) {
      console.error('Failed to save recently viewed:', error)
    }
  }, [])

  const clearRecentlyViewed = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setRecentlyViewed([])
    } catch (error) {
      console.error('Failed to clear recently viewed:', error)
    }
  }, [])

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
  }
}
