const BRAND_LOGO_URLS = {
  bajaj: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/15060940_marcas-10.png',
  akt: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/10656650_marcas-09.png',
  honda: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/22885058_marcas-12.png',
  yamalube: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/42501267_marcas-61.png',
  mobil: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/48568160_marcas-63.png',
  yamaha: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/57432582_marcas-06.png',
  kixx: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/68311880_aceites-06.png',
  motul: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/96259009_marcas-41.png',
  hero: 'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/99540505_marcas-18.png',
}

export const DEFAULT_BRAND_LOGO_URL =
  'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas/IMPORTADOOoK-72-72.png'

function normalizeBrandKey(brand) {
  return brand.trim().toLowerCase().replace(/\s+original$/, '')
}

export function getBrandLogoUrl(brand) {
  if (!brand) {
    return DEFAULT_BRAND_LOGO_URL
  }

  const key = normalizeBrandKey(brand)
  return BRAND_LOGO_URLS[key] ?? DEFAULT_BRAND_LOGO_URL
}

export function withBrandLogo(product) {
  return {
    ...product,
    brandLogo: getBrandLogoUrl(product.brand),
  }
}
