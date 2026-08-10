import { useEffect, useState } from 'react'
import { useProfile, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import {
  defaultProfileSettings,
  PROFILE_LEGAL_LINKS,
} from '@/features/profile/data/profileDefaults'
import { ProfileIdentityCard } from '@/features/profile/components/ProfileIdentityCard/ProfileIdentityCard'
import { confirmAction } from '@/shared/lib/confirmAction'
import { DrawerAccordionSection } from '@/shared/ui/Drawer/DrawerAccordionSection'
import eyeIcon from '@/assets/icons/eye.svg'
import eyeOffIcon from '@/assets/icons/eye-off.svg'
import deleteAccountIcon from '@/assets/icons/delete-account.svg'
import '@/features/orders/components/OrderDrawer/OrderDrawer.css'
import '@/features/profile/components/ProfileDrawer/ProfileDrawer.css'
import './ProfileSettings.css'

const SETTINGS_SECTIONS = [
  { id: 'personal', label: 'Datos personales' },
  { id: 'company', label: 'Datos de la empresa' },
  { id: 'notifications', label: 'Notificaciones' },
  { id: 'cache', label: 'Borrar caché' },
  { id: 'access', label: 'Acceso' },
  { id: 'terms', label: 'Documentos legales' },
  { id: 'delete', label: 'Eliminar cuenta' },
]

function SettingsField({ id, label, type = 'text', value, onChange, disabled = false }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <label className="profile-settings-field" htmlFor={id}>
      <span>
        {label}
        {disabled && <span className="profile-settings-field__lock"> · No editable</span>}
      </span>
      <div className="profile-settings-field__control">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          readOnly={disabled}
          className={isPassword ? 'profile-settings-field__input--password' : ''}
        />
        {isPassword && (
          <button
            type="button"
            className="profile-settings-field__toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
          >
            <img
              src={showPassword ? eyeOffIcon : eyeIcon}
              alt=""
              className="profile-settings-field__toggle-icon"
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </label>
  )
}

export function ProfileSettingsDrawerContent() {
  const {
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    releaseAppCache,
    deleteAccount,
  } = useProfile()
  const { closeDrawer } = useUi()
  const { showToast } = useToast()
  const [openSections, setOpenSections] = useState([])
  const [personalDraft, setPersonalDraft] = useState(() => ({
    ...defaultProfileSettings.personal,
    ...profileSettings.personal,
  }))
  const [companyDraft, setCompanyDraft] = useState(profileSettings.company)
  const [accessDraft, setAccessDraft] = useState(profileSettings.access)

  useEffect(() => {
    setPersonalDraft({
      ...defaultProfileSettings.personal,
      ...profileSettings.personal,
    })
  }, [profileSettings.personal])

  useEffect(() => {
    setCompanyDraft(profileSettings.company)
  }, [profileSettings.company])

  useEffect(() => {
    setAccessDraft(profileSettings.access)
  }, [profileSettings.access])

  const toggleSection = (sectionId) => {
    setOpenSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    )
  }

  const handleSavePersonal = async () => {
    const confirmed = await confirmAction({
      title: '¿Guardar datos personales?',
      text: 'Se actualizará la información de tu perfil.',
      confirmText: 'Guardar datos',
    })

    if (!confirmed) {
      return
    }

    saveProfilePersonal(personalDraft)
    showToast('Datos personales guardados', 'success')
  }

  const handleSaveCompany = async () => {
    const confirmed = await confirmAction({
      title: '¿Guardar datos de la empresa?',
      text: 'Se actualizará la información empresarial.',
      confirmText: 'Guardar datos',
    })

    if (!confirmed) {
      return
    }

    saveProfileCompany(companyDraft)
    showToast('Datos de la empresa guardados', 'success')
  }

  const handleSaveAccess = async () => {
    const confirmed = await confirmAction({
      title: '¿Guardar datos de acceso?',
      text: 'Se actualizarán tu correo y contraseña.',
      confirmText: 'Guardar acceso',
    })

    if (!confirmed) {
      return
    }

    saveProfileAccess(accessDraft)
    showToast('Datos de acceso guardados', 'success')
  }

  const handleClearCache = async () => {
    const confirmed = await confirmAction({
      title: '¿Liberar caché?',
      text: 'Se eliminarán datos temporales de productos, carrito y pedidos.',
      confirmText: 'Liberar caché',
      icon: 'warning',
    })

    if (!confirmed) {
      return
    }

    releaseAppCache()
    showToast('Caché liberada', 'success')
  }

  const handleDeleteAccount = async () => {
    const confirmed = await confirmAction({
      title: '¿Eliminar cuenta?',
      text: 'Esta acción restablecerá tu información local. Debes confirmar para continuar.',
      icon: 'warning',
      confirmText: 'Eliminar cuenta',
      confirmButtonColor: '#c62828',
    })

    if (!confirmed) {
      return
    }

    deleteAccount()
    closeDrawer()
    showToast('Cuenta eliminada', 'success')
  }

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'personal':
        return (
          <div className="profile-settings-form">
            <SettingsField
              id="personal-fullName"
              label="Nombre"
              value={personalDraft.fullName || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, fullName: value }))}
            />
            <SettingsField
              id="personal-documentId"
              label="Cédula"
              value={personalDraft.documentId || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, documentId: value }))}
            />
            <SettingsField
              id="personal-mobile"
              label="Celular"
              type="tel"
              value={personalDraft.mobile || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, mobile: value }))}
            />
            <SettingsField
              id="personal-phone"
              label="Teléfono"
              type="tel"
              value={personalDraft.phone || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, phone: value }))}
            />
            <SettingsField
              id="personal-email"
              label="Correo"
              type="email"
              value={personalDraft.email || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, email: value }))}
            />
            <SettingsField
              id="personal-address"
              label="Dirección"
              value={personalDraft.address || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, address: value }))}
            />
            <SettingsField
              id="personal-neighborhood"
              label="Barrio"
              value={personalDraft.neighborhood || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, neighborhood: value }))}
            />
            <SettingsField
              id="personal-city"
              label="Ciudad"
              value={personalDraft.city || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, city: value }))}
            />
            <SettingsField
              id="personal-department"
              label="Departamento"
              value={personalDraft.department || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, department: value }))}
            />
            <SettingsField
              id="personal-country"
              label="País"
              value={personalDraft.country || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, country: value }))}
            />
            <SettingsField
              id="personal-birthDate"
              label="Fecha"
              value={personalDraft.birthDate || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, birthDate: value }))}
            />
            <SettingsField
              id="personal-gender"
              label="Género"
              value={personalDraft.gender || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, gender: value }))}
            />
            <SettingsField
              id="personal-additional"
              label="Adicional"
              value={personalDraft.additional || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, additional: value }))}
            />
            <SettingsField
              id="personal-role"
              label="Perfil"
              value={personalDraft.role || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, role: value }))}
              disabled
            />
            <SettingsField
              id="personal-userId"
              label="ID usuario"
              value={personalDraft.userId || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, userId: value }))}
              disabled
            />
            <SettingsField
              id="personal-warehouseId"
              label="ID bodega"
              value={personalDraft.warehouseId || ''}
              onChange={(value) => setPersonalDraft((current) => ({ ...current, warehouseId: value }))}
              disabled
            />
            <button type="button" className="profile-settings-save" onClick={handleSavePersonal}>
              Guardar datos
            </button>
          </div>
        )
      case 'company':
        return (
          <div className="profile-settings-form">
            <SettingsField
              id="company-name"
              label="Nombre de la empresa"
              value={companyDraft.name}
              onChange={(value) => setCompanyDraft((current) => ({ ...current, name: value }))}
            />
            <SettingsField
              id="company-nit"
              label="NIT"
              value={companyDraft.nit}
              onChange={(value) => setCompanyDraft((current) => ({ ...current, nit: value }))}
              disabled
            />
            <SettingsField
              id="company-phone"
              label="Teléfono"
              type="tel"
              value={companyDraft.phone}
              onChange={(value) => setCompanyDraft((current) => ({ ...current, phone: value }))}
              disabled
            />
            <SettingsField
              id="company-email"
              label="Correo"
              type="email"
              value={companyDraft.email}
              onChange={(value) => setCompanyDraft((current) => ({ ...current, email: value }))}
            />
            <SettingsField
              id="company-address"
              label="Dirección"
              value={companyDraft.address}
              onChange={(value) => setCompanyDraft((current) => ({ ...current, address: value }))}
              disabled
            />
            <button type="button" className="profile-settings-save" onClick={handleSaveCompany}>
              Guardar datos
            </button>
          </div>
        )
      case 'notifications':
        return (
          <label className="profile-settings-switch">
            <span>Activar notificaciones</span>
            <input
              type="checkbox"
              checked={profileSettings.notificationsEnabled}
              onChange={(event) => {
                setNotificationsEnabled(event.target.checked)
                showToast(
                  event.target.checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas',
                  'success',
                )
              }}
            />
            <span className="profile-settings-switch__track" aria-hidden="true" />
          </label>
        )
      case 'cache':
        return (
          <button type="button" className="profile-settings-cache-btn" onClick={handleClearCache}>
            Presionar para liberar caché
          </button>
        )
      case 'access':
        return (
          <div className="profile-settings-form">
            <SettingsField
              id="access-email"
              label="Correo"
              type="email"
              value={accessDraft.email}
              onChange={(value) => setAccessDraft((current) => ({ ...current, email: value }))}
            />
            <SettingsField
              id="access-password"
              label="Contraseña"
              type="password"
              value={accessDraft.password}
              onChange={(value) => setAccessDraft((current) => ({ ...current, password: value }))}
            />
            <button type="button" className="profile-settings-save" onClick={handleSaveAccess}>
              Guardar acceso
            </button>
          </div>
        )
      case 'terms':
        return (
          <>
            <a
              href={PROFILE_LEGAL_LINKS.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-settings-link"
            >
              <img src={eyeIcon} alt="" className="profile-settings-link__icon" aria-hidden="true" />
              Ver términos y condiciones
            </a>
            <a
              href={PROFILE_LEGAL_LINKS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-settings-link"
            >
              <img src={eyeIcon} alt="" className="profile-settings-link__icon" aria-hidden="true" />
              Ver políticas de privacidad
            </a>
          </>
        )
      case 'delete':
        return (
          <button type="button" className="profile-settings-delete" onClick={handleDeleteAccount}>
            <img src={deleteAccountIcon} alt="" className="profile-settings-delete__icon" aria-hidden="true" />
            Eliminar cuenta
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div className="order-drawer-shell profile-settings-shell">
      <ProfileIdentityCard
        personal={profileSettings.personal}
        avatar={profile.avatar}
      />

      <div className="order-accordion content-list-data profile-settings-accordion">
        {SETTINGS_SECTIONS.map((section) => (
          <DrawerAccordionSection
            key={section.id}
            id={section.id}
            title={section.label}
            isOpen={openSections.includes(section.id)}
            onToggle={toggleSection}
          >
            {renderSectionContent(section.id)}
          </DrawerAccordionSection>
        ))}
      </div>
    </div>
  )
}
