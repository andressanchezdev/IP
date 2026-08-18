import { PROFILE_LEGAL_LINKS } from '@/features/profile/data/profileDefaults'
import { DrawerSectionList } from '@/shared/ui/DrawerShell/DrawerShell'
import eyeIcon from '@/assets/icons/eye.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'

export function NotificationsSection({ enabled, onChange }) {
  return (
    <label className="filter-drawer-check">
      <span>Activar notificaciones</span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
        {...namedControl('Activar notificaciones')}
      />
    </label>
  )
}

export function LegalLinksSection() {
  return (
    <DrawerSectionList>
      <a
        href={PROFILE_LEGAL_LINKS.terms}
        target="_blank"
        rel="noopener noreferrer"
        className="filter-drawer-check profile-settings-link-row"
        {...namedControl('Ver términos y condiciones')}
      >
        <span>Ver términos y condiciones</span>
        <img src={eyeIcon} className="profile-settings-link__icon" {...namedImage('Ver términos y condiciones')} />
      </a>
      <a
        href={PROFILE_LEGAL_LINKS.privacy}
        target="_blank"
        rel="noopener noreferrer"
        className="filter-drawer-check profile-settings-link-row"
        {...namedControl('Ver políticas de privacidad')}
      >
        <span>Ver políticas de privacidad</span>
        <img src={eyeIcon} className="profile-settings-link__icon" {...namedImage('Ver políticas de privacidad')} />
      </a>
    </DrawerSectionList>
  )
}
