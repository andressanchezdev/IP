import { getBrandLogoUrl } from '../../../utils/brandLogos'

export function BrandLogo({ brand, className, alt }) {
  return (
    <img
      src={getBrandLogoUrl(brand)}
      alt={alt ?? brand ?? 'Marca'}
      className={className}
    />
  )
}
