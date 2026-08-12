import { ProfileDrawerContent } from '@/features/profile/components/ProfileDrawer/ProfileDrawerContent'
import { ProfileSettingsDrawerContent } from '@/features/profile/components/ProfileSettings/ProfileSettingsDrawerContent'
import {
  BulkUploadFileContent,
} from '@/features/profile/components/BulkUpload/BulkUploadViews'
import {
  ProfileCatalogPickerContent,
  ProfileDownloadMethodContent,
} from '@/features/profile/components/ProfilePriceList/ProfilePriceListViews'

/** Contenido del drawer de perfil según la sub-vista activa. */
export function ProfileDrawerSubViews({ profileSubView, setProfileSubView, closeDrawer }) {
  if (profileSubView === 'settings') {
    return <ProfileSettingsDrawerContent />
  }
  if (profileSubView === 'bulk-upload') {
    return (
      <BulkUploadFileContent
        onCancelOrder={() => setProfileSubView(null)}
        onOrderSent={() => {
          setProfileSubView(null)
          closeDrawer()
        }}
      />
    )
  }
  if (profileSubView === 'price-download') {
    return (
      <ProfileDownloadMethodContent
        onSelect={() => setProfileSubView(null)}
      />
    )
  }
  if (profileSubView === 'price-brand') {
    return (
      <ProfileCatalogPickerContent
        field="brand"
        title="Marca"
        onSelect={() => setProfileSubView(null)}
      />
    )
  }
  if (profileSubView === 'price-category') {
    return (
      <ProfileCatalogPickerContent
        field="category"
        title="Categoría"
        onSelect={() => setProfileSubView(null)}
      />
    )
  }
  if (profileSubView === 'price-model') {
    return (
      <ProfileCatalogPickerContent
        field="model"
        title="Modelo"
        onSelect={() => setProfileSubView(null)}
      />
    )
  }
  return (
    <ProfileDrawerContent
      onOpenBulkUpload={() => setProfileSubView('bulk-upload')}
      onOpenPriceListView={(actionId) => {
        const next = {
          download: 'price-download',
          brand: 'price-brand',
          category: 'price-category',
          model: 'price-model',
        }[actionId]
        if (next) {
          setProfileSubView(next)
        }
      }}
    />
  )
}
