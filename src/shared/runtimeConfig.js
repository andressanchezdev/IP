export const runtimeConfig = typeof window !== 'undefined'
  && window.__APP_CONFIG__
  && typeof window.__APP_CONFIG__ === 'object'
  ? window.__APP_CONFIG__
  : {}