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

// ── Games ────────────────────────────────────────────────────────────────────

export const searchGames = (q: string) =>
  api.get<SearchResult[]>('/games/search', { params: { q } }).then((r) => r.data)

export const getFeaturedDeals = () =>
  api.get<any[]>('/games/featured').then((r) => r.data)

export const getDeals = (skip = 0, limit = 40) =>
  api.get<Game[]>('/games/deals', { params: { skip, limit } }).then((r) => r.data)

export const getGame = (steamAppid: string, refresh = false) =>
  api.get<Game>(`/games/${steamAppid}`, { params: { refresh } }).then((r) => r.data)

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

export const addToWishlist = (game_id: number, target_price?: number) =>
  api.post<WishlistItem>('/wishlist', { game_id, target_price }).then((r) => r.data)

export const removeFromWishlist = (id: number) =>
  api.delete(`/wishlist/${id}`)

export const updateTargetPrice = (id: number, target_price: number) =>
  api.patch<WishlistItem>(`/wishlist/${id}/target-price`, null, {
    params: { target_price },
  }).then((r) => r.data)

// ── Alerts ────────────────────────────────────────────────────────────────────

export const getAlerts = () =>
  api.get<PriceAlert[]>('/alerts').then((r) => r.data)

export const createAlert = (game_id: number, target_price: number, notify_email = true) =>
  api.post<PriceAlert>('/alerts', { game_id, target_price, notify_email }).then((r) => r.data)

export const deleteAlert = (id: number) =>
  api.delete(`/alerts/${id}`)

export const toggleAlert = (id: number) =>
  api.patch<PriceAlert>(`/alerts/${id}/toggle`).then((r) => r.data)
