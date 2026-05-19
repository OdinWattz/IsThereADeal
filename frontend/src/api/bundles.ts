import api from './client'

export interface BundleGame {
  name: string
  machine_name?: string
}

export interface Bundle {
  name: string
  slug?: string
  bundle_id?: string
  thumbnail?: string
  description?: string
  price?: number
  short_url: string
  source: string
  games: BundleGame[]
  expiry_date?: string
}

export interface BundlesBySource {
  humble: Bundle[]
  fanatical: Bundle[]
}

export interface GameInBundle {
  bundle_name: string
  bundle_source: string
  bundle_price?: number
  bundle_url: string
  expiry_date?: string
  game_in_bundle: string
}

export const getCurrentBundles = () =>
  api.get<BundlesBySource>('/bundles/current').then(r => r.data)

export const checkGameInBundles = (game_name: string) =>
  api.get<GameInBundle[]>(`/bundles/game/${encodeURIComponent(game_name)}`).then(r => r.data)
