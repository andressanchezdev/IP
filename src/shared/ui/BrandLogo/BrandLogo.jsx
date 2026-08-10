import { getBrandLogoUrl } from '@/shared/lib/brandLogos'

export function BrandLogo({ brand, logoUrl, className, alt }) {
  return (
    <img
      src={logoUrl || getBrandLogoUrl(brand)}
      alt={alt ?? brand ?? 'Marca'}
      className={className}
    />
  )
}
