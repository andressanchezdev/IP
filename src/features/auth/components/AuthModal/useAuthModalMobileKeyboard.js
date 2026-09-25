import { useEffect } from 'react'

const MOBILE_MQ = '(max-width: 768px)'
const KEYBOARD_GAP_PX = 80

/**
 * Reposiciona el login modal dentro del visualViewport cuando el teclado móvil
 * reduce el área visible. No aplica en desktop (>768px).
 */
export function useAuthModalMobileKeyboard(isOpen) {
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return undefined
    }

    const vv = window.visualViewport
    if (!vv) {
      return undefined
    }

    const mq = window.matchMedia(MOBILE_MQ)

    const resolveModal = () => document.querySelector('.auth-modal.auth-modal--login')

    const clearInline = (el) => {
      el.classList.remove('auth-modal--keyboard-open')
      el.style.removeProperty('top')
      el.style.removeProperty('height')
      el.style.removeProperty('max-height')
      el.style.removeProperty('transform')
      el.style.removeProperty('--auth-vv-height')
      el.style.removeProperty('--auth-vv-offset-top')
    }

    const sync = () => {
      const el = resolveModal()
      if (!el) {
        return
      }

      if (!mq.matches) {
        clearInline(el)
        return
      }

      const visibleHeight = vv.height
      const keyboardOpen = visibleHeight < window.innerHeight - KEYBOARD_GAP_PX

      el.style.setProperty('--auth-vv-height', `${visibleHeight}px`)
      el.style.setProperty('--auth-vv-offset-top', `${vv.offsetTop}px`)

      if (!keyboardOpen) {
        el.classList.remove('auth-modal--keyboard-open')
        el.style.removeProperty('top')
        el.style.removeProperty('height')
        el.style.removeProperty('max-height')
        el.style.removeProperty('transform')
        return
      }

      const maxH = Math.max(220, visibleHeight - 12)
      const height = Math.min(maxH, visibleHeight * 0.98)
      const centerY = vv.offsetTop + visibleHeight / 2

      el.classList.add('auth-modal--keyboard-open')
      el.style.top = `${centerY}px`
      el.style.transform = 'translate(-50%, -50%)'
      el.style.height = `${height}px`
      el.style.maxHeight = `${maxH}px`
    }

    const onFocusIn = (event) => {
      if (!mq.matches) {
        return
      }
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }
      if (!target.matches('input, textarea, select')) {
        return
      }
      window.requestAnimationFrame(() => {
        sync()
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      })
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('orientationchange', sync)
    document.addEventListener('focusin', onFocusIn)
    mq.addEventListener?.('change', sync)

    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('orientationchange', sync)
      document.removeEventListener('focusin', onFocusIn)
      mq.removeEventListener?.('change', sync)
      const el = resolveModal()
      if (el) {
        clearInline(el)
      }
    }
  }, [isOpen])
}
