export type ProductPrices = {
  mayorista: number
  minorista: number
  empresarial: number
}

export type ProductRecord = {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  modelo: string
  precios: ProductPrices[]
  cantidad: number
  bodega: string
  imagen?: string | null
  status: string
  creado_en: string
  actualizado_en: string
  categoryId?: string
  category?: string
  marca?: string
  /** Fiscales API → POST /inventory/carts (no inventados). */
  compra?: number
  iva?: number
  exento?: number
  aplicacion?: string
}

export type LandingTeamGroup = 'asesor' | 'administrativo'
export type LandingTeamStatus = 'borrador' | 'publicado' | 'archivado'

export type LandingTeamMember = {
  id: string
  fullName: string
  role: string
  phoneDisplay: string
  whatsappDigits: string
  imageUrl: string
  group: LandingTeamGroup
  status: LandingTeamStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
}
