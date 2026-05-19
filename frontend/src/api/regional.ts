import api from './client'

export interface RegionalStorePrice {
  store: string
  price: number
  regular?: number
  discount: number
  currency: string
}

export interface RegionalPrice {
  region: string
  name: string
  flag: string
  currency: string
  best_price?: number
  best_store?: string
  stores: RegionalStorePrice[]
}

export interface RegionalPrices {
  [regionCode: string]: RegionalPrice
}

export interface Region {
  name: string
  currency: string
  flag: string
}

export interface Regions {
  [code: string]: Region
}

export const getRegionalPrices = (steam_appid: string, regions?: string[]) =>
  api.get<RegionalPrices>(`/regional/prices/${steam_appid}`, {
    params: regions ? { regions: regions.join(',') } : {}
  }).then(r => r.data)

export const getSupportedRegions = () =>
  api.get<Regions>('/regional/regions').then(r => r.data)
