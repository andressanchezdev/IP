import { ProfileDrawerContent } from '@/features/profile/components/ProfileDrawer/ProfileDrawerContent'
import { ProfileSettingsDrawerContent } from '@/features/profile/components/ProfileSettings/ProfileSettingsDrawerContent'
import {
  BulkUploadFileContent,
} from '@/features/profile/components/BulkUpload/BulkUploadViews'

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
  return (
    <ProfileDrawerContent
      onOpenBulkUpload={() => setProfileSubView('bulk-upload')}
    />
  )
}
