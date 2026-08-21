import { loadSweetAlert } from '@/shared/lib/loadSweetAlert'

export async function confirmAction({
  title,
  text,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon = 'question',
  confirmButtonColor,
} = {}) {
  const Swal = await loadSweetAlert()
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    ...(confirmButtonColor ? { confirmButtonColor } : {}),
  })

  return result.isConfirmed
}

export async function notifyAction({
  title,
  text,
  confirmText = 'Entendido',
  icon = 'info',
} = {}) {
  const Swal = await loadSweetAlert()
  await Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: confirmText,
  })
}
