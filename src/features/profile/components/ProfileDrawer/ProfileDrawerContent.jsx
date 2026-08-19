import { useMemo, useState } from 'react'
import { useAuth, useProfile } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { formatPrice } from '@/shared/lib/formatPrice'
import { ProfileIdentityCard } from '@/features/profile/components/ProfileIdentityCard/ProfileIdentityCard'
import { useGeneralFilter } from '@/features/catalog/hooks/useGeneralFilter'
import { MultiFilterField } from '@/features/catalog/components/FilterDrawer/MultiFilterField'
import {
  FILTER_OPTIONS_VISIBLE_IDLE,
  FILTER_OPTIONS_VISIBLE_SEARCH,
  postInventoryProductsList,
} from '@/features/catalog/api/generalApi'
import { mapApiProducts } from '@/features/catalog/mappers/mapProduct'
import {
  buildFilterLabelLookup,
  buildProductsListBody,
  isFilterSelectionBlocked,
  resolveSelectedLabels,
} from '@/features/catalog/utils/catalogFilters'
import { downloadPriceListPdf } from '@/shared/lib/downloadPriceListPdf'
import { downloadPriceListExcel } from '@/shared/lib/downloadPriceListExcel'
import {
  DrawerCheckRow,
  DrawerPanel,
  DrawerSectionBody,
  DrawerSectionList,
  DrawerShell,
} from '@/shared/ui/DrawerShell/DrawerShell'
import listIcon from '@/assets/icons/list.svg'
import receiptIcon from '@/assets/icons/receipt.svg'
import creditCardIcon from '@/assets/icons/credit-card.svg'
import percentIcon from '@/assets/icons/percent.svg'
import shoppingBagIcon from '@/assets/icons/shopping-bag.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import mapPinIcon from '@/assets/icons/map-pin.svg'
import cloudUploadIcon from '@/assets/icons/cloud-upload.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import './ProfileDrawer.css'
import '@/features/profile/components/ProfilePriceList/ProfilePriceList.css'

const PROFILE_SECTIONS = [
  { id: 'price-list', label: 'Listado de precios', icon: listIcon },
  { id: 'debts', label: 'Adeudos', icon: receiptIcon },
  { id: 'credit', label: 'Crédito', icon: creditCardIcon },
  { id: 'discounts', label: 'Descuentos', icon: percentIcon },
  { id: 'purchases', label: 'Compras', icon: shoppingBagIcon },
  { id: 'balance', label: 'Saldo a favor', icon: walletIcon },
  { id: 'addresses', label: 'Direcciones de entrega', icon: mapPinIcon },
  { id: 'bulk-upload', label: 'Subida masiva', icon: cloudUploadIcon },
]

const PRICE_LIST_ACTIONS = [
  { id: 'excel', label: 'Excel' },
  { id: 'pdf', label: 'PDF' },
]
const PRICE_LIST_METHOD_LABELS = {
  excel: 'Excel',
  pdf: 'PDF',
}

function ProfilePanelRow({ label, value, highlight = false }) {
  return (
    <div className="content-list-data__row">
      <span className="content-list-data__label">{label}</span>
      <span className={`content-list-data__value ${highlight ? 'content-list-data__value--highlight' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export function ProfileDrawerContent({ onOpenBulkUpload }) {
  const { profile, profileSettings } = useProfile()
  const { tokenAccess } = useAuth()
  const { showToast } = useToast()
  const [openSectionId, setOpenSectionId] = useState(null)
  const [priceDownloadMethod, setPriceDownloadMethod] = useState('pdf')
  const [priceDownloadMethodOpen, setPriceDownloadMethodOpen] = useState(false)
  const [isDownloadingPriceList, setIsDownloadingPriceList] = useState(false)
  const [priceListFilters, setPriceListFilters] = useState({
    brands: [],
    categories: [],
    models: [],
  })
  const [priceQuickMode, setPriceQuickMode] = useState({
    brands: 'all',
    categories: 'all',
    models: 'all',
  })
  const [openPriceFilterId, setOpenPriceFilterId] = useState(null)
  const {
    categorias,
    marcas,
    modelos,
    status: filterStatus,
    error: filterError,
  } = useGeneralFilter({ enabled: openSectionId === 'price-list' })

  const isPriceFilterLoading = filterStatus === 'loading'

  const filterLookups = useMemo(() => ({
    brands: buildFilterLabelLookup(marcas),
    categories: buildFilterLabelLookup(categorias),
    models: buildFilterLabelLookup(modelos),
  }), [marcas, categorias, modelos])

  const toggleSection = (sectionId) => {
    if (sectionId === 'bulk-upload') {
      onOpenBulkUpload?.()
      return
    }

    setOpenSectionId((current) => (current === sectionId ? null : sectionId))
  }

  const togglePriceFilterSection = (sectionId) => {
    setPriceDownloadMethodOpen(false)
    setOpenPriceFilterId((current) => (current === sectionId ? null : sectionId))
  }

  const addPriceFilterValue = (key, value) => {
    setPriceQuickMode((current) => ({ ...current, [key]: 'custom' }))
    setPriceListFilters((current) => {
      const list = current[key] || []
      const id = String(value)
      if (list.includes(id)) {
        return current
      }
      return { ...current, [key]: [...list, id] }
    })
  }

  const removePriceFilterValue = (key, value) => {
    setPriceListFilters((current) => {
      const nextList = (current[key] || []).filter((entry) => entry !== String(value))
      if (nextList.length === 0) {
        setPriceQuickMode((modes) => ({ ...modes, [key]: 'all' }))
      }
      return {
        ...current,
        [key]: nextList,
      }
    })
  }

  const confirmPriceListDownload = async () => {
    if (isFilterSelectionBlocked(priceQuickMode)) {
      showToast('No hay productos para descargar con los filtros actuales', 'error')
      return
    }

    const token = tokenAccess
    if (!token) {
      showToast('Inicie sesión para descargar el listado', 'error')
      return
    }

    const body = buildProductsListBody({
      brands: priceListFilters.brands,
      categories: priceListFilters.categories,
      models: priceListFilters.models,
      modes: priceQuickMode,
    })

    setIsDownloadingPriceList(true)

    try {
      const result = await postInventoryProductsList({ token, body })
      const mappedProducts = mapApiProducts(result.productos)

      if (mappedProducts.length === 0) {
        showToast('No hay productos para descargar con los filtros actuales', 'error')
        return
      }

      const exportFilters = {
        brand: resolveSelectedLabels(priceListFilters.brands, filterLookups.brands).join(', '),
        category: resolveSelectedLabels(priceListFilters.categories, filterLookups.categories).join(', '),
        model: resolveSelectedLabels(priceListFilters.models, filterLookups.models).join(', '),
      }

      if (priceDownloadMethod === 'excel') {
        await downloadPriceListExcel({
          products: mappedProducts,
          filename: 'listado-precios.xlsx',
        })
        showToast('Excel de listado descargado', 'success')
        return
      }

      downloadPriceListPdf({
        products: mappedProducts,
        filters: exportFilters,
        filename: 'listado-precios.pdf',
      })
      showToast('PDF de listado descargado', 'success')
    } catch (error) {
      showToast(error?.message || 'No se pudo obtener el listado de precios', 'error')
    } finally {
      setIsDownloadingPriceList(false)
    }
  }

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'price-list':
        return (
          <div className="profile-price-list__actions">
            <div className="drawer-shell-section">
              <DrawerCheckRow
                active={priceDownloadMethodOpen}
                onClick={() => {
                  setOpenPriceFilterId(null)
                  setPriceDownloadMethodOpen((current) => !current)
                }}
                label="Método de descarga"
              >
                <span>Método de descarga</span>
                <span className="content-list-data__value content-list-data__value--highlight">
                  {PRICE_LIST_METHOD_LABELS[priceDownloadMethod]}
                </span>
                <span
                  className={`filter-drawer-check__caret${priceDownloadMethodOpen ? ' filter-drawer-check__caret--open' : ''}`}
                  aria-hidden="true"
                />
              </DrawerCheckRow>
              {priceDownloadMethodOpen ? (
                <DrawerSectionBody>
                  <div className="drawer-shell-section-options drawer-shell-section-options--scroll" style={{ '--filter-option-rows': 4 }}>
                    {PRICE_LIST_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className="content-list-data__row content-list-data__row--action"
                        onClick={() => {
                          setPriceDownloadMethod(action.id)
                          setPriceDownloadMethodOpen(false)
                        }}
                        aria-pressed={priceDownloadMethod === action.id}
                        {...namedControl(`Método ${action.label}`)}
                      >
                        <span className="content-list-data__label">{action.label}</span>
                        <span
                          className={`content-list-data__value${priceDownloadMethod === action.id ? ' content-list-data__value--highlight' : ''}`}
                          aria-hidden="true"
                        >
                          {priceDownloadMethod === action.id ? '✓' : '›'}
                        </span>
                      </button>
                    ))}
                  </div>
                </DrawerSectionBody>
              ) : null}
            </div>

            <MultiFilterField
              id="price-brands"
              label="Marca a escoger"
              emptyLabel="Sin marcas disponibles"
              options={marcas}
              selected={priceListFilters.brands}
              isOpen={openPriceFilterId === 'price-brands'}
              onToggle={togglePriceFilterSection}
              onAdd={(value) => addPriceFilterValue('brands', value)}
              onRemove={(value) => removePriceFilterValue('brands', value)}
              visibleIdleRows={FILTER_OPTIONS_VISIBLE_IDLE}
              visibleSearchRows={FILTER_OPTIONS_VISIBLE_SEARCH}
              isLoading={isPriceFilterLoading}
              errorMessage={filterError}
              quickMode={priceQuickMode.brands}
              onSelectAll={() => {
                setPriceQuickMode((current) => ({ ...current, brands: 'all' }))
                setPriceListFilters((current) => ({ ...current, brands: [] }))
              }}
              onSetNone={() => {
                setPriceQuickMode((current) => ({ ...current, brands: 'none' }))
                setPriceListFilters((current) => ({ ...current, brands: [] }))
              }}
              onClearFilter={() => {
                setPriceQuickMode((current) => ({ ...current, brands: 'all' }))
                setPriceListFilters((current) => ({ ...current, brands: [] }))
              }}
            />

            <MultiFilterField
              id="price-categories"
              label="Categoría a escoger"
              emptyLabel="Sin categorías disponibles"
              options={categorias}
              selected={priceListFilters.categories}
              isOpen={openPriceFilterId === 'price-categories'}
              onToggle={togglePriceFilterSection}
              onAdd={(value) => addPriceFilterValue('categories', value)}
              onRemove={(value) => removePriceFilterValue('categories', value)}
              visibleIdleRows={FILTER_OPTIONS_VISIBLE_IDLE}
              visibleSearchRows={FILTER_OPTIONS_VISIBLE_SEARCH}
              isLoading={isPriceFilterLoading}
              errorMessage={filterError}
              quickMode={priceQuickMode.categories}
              onSelectAll={() => {
                setPriceQuickMode((current) => ({ ...current, categories: 'all' }))
                setPriceListFilters((current) => ({ ...current, categories: [] }))
              }}
              onSetNone={() => {
                setPriceQuickMode((current) => ({ ...current, categories: 'none' }))
                setPriceListFilters((current) => ({ ...current, categories: [] }))
              }}
              onClearFilter={() => {
                setPriceQuickMode((current) => ({ ...current, categories: 'all' }))
                setPriceListFilters((current) => ({ ...current, categories: [] }))
              }}
            />

            <MultiFilterField
              id="price-models"
              label="Modelo a escoger"
              emptyLabel="Sin modelos disponibles"
              options={modelos}
              selected={priceListFilters.models}
              isOpen={openPriceFilterId === 'price-models'}
              onToggle={togglePriceFilterSection}
              onAdd={(value) => addPriceFilterValue('models', value)}
              onRemove={(value) => removePriceFilterValue('models', value)}
              visibleIdleRows={FILTER_OPTIONS_VISIBLE_IDLE}
              visibleSearchRows={FILTER_OPTIONS_VISIBLE_SEARCH}
              isLoading={isPriceFilterLoading}
              errorMessage={filterError}
              quickMode={priceQuickMode.models}
              onSelectAll={() => {
                setPriceQuickMode((current) => ({ ...current, models: 'all' }))
                setPriceListFilters((current) => ({ ...current, models: [] }))
              }}
              onSetNone={() => {
                setPriceQuickMode((current) => ({ ...current, models: 'none' }))
                setPriceListFilters((current) => ({ ...current, models: [] }))
              }}
              onClearFilter={() => {
                setPriceQuickMode((current) => ({ ...current, models: 'all' }))
                setPriceListFilters((current) => ({ ...current, models: [] }))
              }}
            />

            <button
              type="button"
              className="content-main-data-carrito__checkout profile-price-list__confirm"
              onClick={confirmPriceListDownload}
              disabled={isDownloadingPriceList}
              {...namedControl('Confirmar listado de precios')}
            >
              {isDownloadingPriceList ? 'Descargando…' : 'Confirmar'}
            </button>
          </div>
        )
      case 'debts':
        return <ProfilePanelRow label="Total adeudado" value={formatPrice(profile.adeudos)} highlight />
      case 'credit':
        return <ProfilePanelRow label="Cupo disponible" value={formatPrice(profile.credito)} highlight />
      case 'discounts':
        return <ProfilePanelRow label="Descuentos activos" value={formatPrice(profile.descuentos)} highlight />
      case 'purchases':
        return <ProfilePanelRow label="Compras realizadas" value={String(profile.compras ?? 0)} highlight />
      case 'balance':
        return <ProfilePanelRow label="Saldo disponible" value={formatPrice(profile.saldoFavor)} highlight />
      case 'addresses':
        if (!profile.addresses?.length) {
          return <ProfilePanelRow label="Direcciones" value="Sin direcciones registradas" />
        }
        return profile.addresses.map((entry) => (
          <div key={entry.id} className="profile-address">
            <strong className="profile-address__label">{entry.label}</strong>
            <span className="profile-address__value">{entry.address}</span>
          </div>
        ))
      default:
        return null
    }
  }

  return (
    <DrawerShell>
      <DrawerPanel>
        <ProfileIdentityCard
          personal={profileSettings.personal}
          avatar={profile.avatar}
        />
      </DrawerPanel>

      <DrawerPanel title="Información de Usuario" variant="quick">
        <DrawerSectionList>
          {PROFILE_SECTIONS.map((section) => {
            const isOpen = openSectionId === section.id
            return (
              <div key={section.id} className="profile-drawer-section">
                <DrawerCheckRow
                  active={isOpen}
                  onClick={() => toggleSection(section.id)}
                  label={section.label}
                >
                  <span className="profile-drawer-section__label">
                    <img
                      src={section.icon}
                      className="profile-drawer-section__icon"
                      {...namedImage(section.label)}
                    />
                    {section.label}
                  </span>
                  <span
                    className={`filter-drawer-check__caret${isOpen && section.id !== 'bulk-upload' ? ' filter-drawer-check__caret--open' : ''}`}
                    aria-hidden="true"
                  />
                </DrawerCheckRow>
                {isOpen && section.id !== 'bulk-upload' ? (
                  <DrawerSectionBody>
                    {renderSectionContent(section.id)}
                  </DrawerSectionBody>
                ) : null}
              </div>
            )
          })}
        </DrawerSectionList>
      </DrawerPanel>
    </DrawerShell>
  )
}
