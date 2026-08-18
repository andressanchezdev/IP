import { getBrandLogoUrl } from '@/shared/lib/brandLogos'
import { namedImage } from '@/shared/lib/namedControl'

export function BrandLogo({ brand, logoUrl, className, alt }) {
  const label = alt ?? brand ?? 'Marca'
  return (
    <img
      src={logoUrl || getBrandLogoUrl(brand)}
      className={className}
      {...namedImage(label)}
    />
  )
}
