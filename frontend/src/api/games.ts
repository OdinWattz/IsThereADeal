import api from './client'

export interface GamePrice {
  store_name: string
  store_id?: string
  regular_price?: number
  sale_price?: number
  discount_percent: number
  currency: string
  url?: string
  is_on_sale: boolean
  fetched_at?: string
  is_key_reseller?: boolean
}

export interface Game {
  id: number
  steam_appid: string
  name: string
  header_image?: string
  short_description?: string
  genres?: string
  developers?: string
  publishers?: string
  release_date?: string
  steam_url?: string
  prices: GamePrice[]
  best_price?: number
  best_store?: string
  historic_low_price?: number
  historic_low_date?: string
  metacritic_score?: number
  steam_review_score?: number
  steam_review_count?: number
  player_count_current?: number
  player_count_peak?: number
}

export interface PriceHistoryPoint {
  store_name: string
  price: number
  regular_price?: number
  discount_percent: number
  currency: string
  recorded_at: string
}

export interface SearchResult {
  steam_appid: string
  name: string
  header_image?: string
  is_in_db: boolean
  game_id?: number
}

export interface WishlistItem {
  id: number
  game_id: number
  added_at: string
  target_price?: number
  game: Game
}

export interface PriceAlert {
  id: number
  game_id: number
  target_price: number
  is_active: boolean
  created_at: string
  triggered_at?: string
  notify_email: boolean
  game: Game
}

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  created_at: string
}

// ── Profile / User Management ────────────────────────────────────────────────

export const updateProfile = (data: { username?: string; email?: string }) =>
  api.patch<User>('/auth/me', data).then(r => r.data)

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  })

export const deleteAccount = (password: string) =>
  api.delete('/auth/me', { data: { current_password: password } }).then(r => r.data)

// ── Games ────────────────────────────────────────────────────────────────────

export const searchGames = (q: string) =>
  api.get<SearchResult[]>('/games/search', { params: { q } }).then((r) => r.data)

export const getFeaturedDeals = () =>
  api.get<any[]>('/games/featured').then((r) => r.data)

export interface TrendingDeal {
  steam_appid: string
  name: string
  sale_price: number
  regular_price: number
  discount_percent: number
  store_name: string
  header_image: string
  deal_rating: number
}

export const getDeals = (page = 0, limit = 20) =>
  api.get<TrendingDeal[]>('/games/deals', { params: { page, limit } }).then((r) => r.data)

export const getGame = (steamAppid: string, refresh = false, includeKeyResellers = false) =>
  api.get<Game>(`/games/${steamAppid}`, {
    params: { refresh, include_key_resellers: includeKeyResellers }
  }).then((r) => r.data)

export const getPriceHistory = (steamAppid: string) =>
  api.get<PriceHistoryPoint[]>(`/games/${steamAppid}/history`).then((r) => r.data)

export interface DlcDeal {
  steam_appid: string
  title: string
  sale_price?: number
  regular_price?: number
  discount_percent: number
  store_name: string
  url?: string
  currency: string
}

export const getDlcDeals = (steamAppid: string) =>
  api.get<DlcDeal[]>(`/games/${steamAppid}/dlc-deals`).then((r) => r.data)

export interface FreeGame {
  steam_appid: string
  name: string
  store_name: string
  header_image: string
  deal_rating: number
  url: string
}

export const getFreeGames = (limit = 50) =>
  api.get<FreeGame[]>('/games/free', { params: { limit } }).then((r) => r.data)

// ── Auth ─────────────────────────────────────────────────────────────────────

export const register = (username: string, email: string, password: string) =>
  api.post('/auth/register', { username, email, password }).then((r) => r.data)

export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then((r) => r.data)

export const getMe = () =>
  api.get<User>('/auth/me').then((r) => r.data)

// ── Wishlist ──────────────────────────────────────────────────────────────────

export const getWishlist = () =>
  api.get<WishlistItem[]>('/wishlist').then((r) => r.data)

export const addToWishlist = (gameIdOrAppid: number | string, target_price?: number) => {
  const payload = typeof gameIdOrAppid === 'string'
    ? { steam_appid: gameIdOrAppid, target_price }
    : { game_id: gameIdOrAppid, target_price }
  return api.post<WishlistItem>('/wishlist', payload).then((r) => r.data)
}

export const removeFromWishlist = (id: number) =>
  api.delete(`/wishlist/${id}`)

export const updateTargetPrice = (id: number, target_price: number) =>
  api.patch<WishlistItem>(`/wishlist/${id}/target-price`, null, {
    params: { target_price },
  }).then((r) => r.data)

// ── Alerts ────────────────────────────────────────────────────────────────────

export const getAlerts = () =>
  api.get<PriceAlert[]>('/alerts').then((r) => r.data)

export const createAlert = (gameIdOrAppid: number | string, target_price: number, notify_email = true) => {
  const payload = typeof gameIdOrAppid === 'string'
    ? { steam_appid: gameIdOrAppid, target_price, notify_email }
    : { game_id: gameIdOrAppid, target_price, notify_email }
  return api.post<PriceAlert>('/alerts', payload).then((r) => r.data)
}

export const deleteAlert = (id: number) =>
  api.delete(`/alerts/${id}`)

export const toggleAlert = (id: number) =>
  api.patch<PriceAlert>(`/alerts/${id}/toggle`).then((r) => r.data)

// ── Collections ───────────────────────────────────────────────────────────────

export interface CollectionItem {
  id: number
  game_id: number
  added_at: string
  notes?: string
  game: Game
}

export interface Collection {
  id: number
  user_id: number
  name: string
  description?: string
  is_public: boolean
  created_at: string
  updated_at: string
  items: CollectionItem[]
}

export const getCollections = () =>
  api.get<Collection[]>('/collections').then((r) => r.data)

export const getCollection = (id: number) =>
  api.get<Collection>(`/collections/${id}`).then((r) => r.data)

export const createCollection = (name: string, description?: string, isPublic = false) =>
  api.post<Collection>('/collections', { name, description, is_public: isPublic }).then((r) => r.data)

export const updateCollection = (id: number, data: { name?: string; description?: string; is_public?: boolean }) =>
  api.patch<Collection>(`/collections/${id}`, data).then((r) => r.data)

export const deleteCollection = (id: number) =>
  api.delete(`/collections/${id}`)

export const addGameToCollection = (collectionId: number, gameIdOrAppid: number | string, notes?: string) => {
  const payload = typeof gameIdOrAppid === 'string'
    ? { steam_appid: gameIdOrAppid, notes }
    : { game_id: gameIdOrAppid, notes }
  return api.post<CollectionItem>(`/collections/${collectionId}/items`, payload).then((r) => r.data)
}

export const removeGameFromCollection = (collectionId: number, itemId: number) =>
  api.delete(`/collections/${collectionId}/items/${itemId}`)

export const updateCollectionItemNotes = (collectionId: number, itemId: number, notes: string) =>
  api.patch(`/collections/${collectionId}/items/${itemId}/notes`, null, { params: { notes } })

// ── Followed Games ────────────────────────────────────────────────────────────

export interface FollowedGame {
  id: number
  game_id: number
  followed_at: string
  notify_on_sale: boolean
  notify_on_release: boolean
  game: Game
}

export const getFollowedGames = () =>
  api.get<FollowedGame[]>('/followed').then((r) => r.data)

export const followGame = (gameIdOrAppid: number | string, notifyOnSale = true, notifyOnRelease = false) => {
  const payload = typeof gameIdOrAppid === 'string'
    ? { steam_appid: gameIdOrAppid, notify_on_sale: notifyOnSale, notify_on_release: notifyOnRelease }
    : { game_id: gameIdOrAppid, notify_on_sale: notifyOnSale, notify_on_release: notifyOnRelease }
  return api.post<FollowedGame>('/followed', payload).then((r) => r.data)
}

export const unfollowGame = (id: number) =>
  api.delete(`/followed/${id}`)

export const updateFollowNotifications = (id: number, notifyOnSale: boolean, notifyOnRelease: boolean) =>
  api.patch(`/followed/${id}/notifications`, null, {
    params: { notify_on_sale: notifyOnSale, notify_on_release: notifyOnRelease }
  })

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface UserSavings {
  total_wishlist_games: number
  games_on_sale: number
  games_at_target_price: number
  total_regular_price: number
  total_sale_price: number
  potential_savings: number
  target_price_savings: number
  savings_percentage: number
  active_alerts: number
  recent_alert_triggers: number
}

export interface UserActivity {
  wishlist_count: number
  active_alerts_count: number
  recent_wishlist_additions: number
}

export const getUserSavings = () =>
  api.get<UserSavings>('/stats/savings').then((r) => r.data)

export const getUserActivity = () =>
  api.get<UserActivity>('/stats/activity').then((r) => r.data)
