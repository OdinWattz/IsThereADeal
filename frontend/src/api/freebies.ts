import api from './client'

export interface Freebie {
  title: string
  thumbnail?: string
  original_price?: number
  source: string
  url: string
  epic_id?: string
}

export interface FreebiesBySource {
  epic: Freebie[]
  prime: Freebie[]
}

export interface FreebieSources {
  [key: string]: { name: string; icon: string; url_base: string }
}

export const getCurrentFreebies = () =>
  api.get<FreebiesBySource>('/freebies/current').then(r => r.data)

export const checkGameIsFree = (steam_appid: string, game_name: string) =>
  api.get<Freebie | null>(`/freebies/game/${steam_appid}`, { params: { game_name } }).then(r => r.data)

export const getFreebieSources = () =>
  api.get<FreebieSources>('/freebies/sources').then(r => r.data)
