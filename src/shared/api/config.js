import { runtimeConfig } from '@/shared/runtimeConfig'

const apiBaseUrl = runtimeConfig.API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''
const apiAssetBaseUrl = runtimeConfig.API_ASSET_BASE_URL
  ?? import.meta.env.VITE_API_ASSET_BASE_URL
  ?? 'https://storage.googleapis.com/importadorapremiumonline'

export const API_BASE_URL = String(apiBaseUrl).trim().replace(/\/+$/, '')

export const API_ASSET_BASE_URL = String(apiAssetBaseUrl).trim().replace(/\/+$/, '')

export const DEFAULT_STOCK_WAREHOUSE_ID = '6'
