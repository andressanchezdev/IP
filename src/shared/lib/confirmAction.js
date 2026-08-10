import Swal from 'sweetalert2'

export async function confirmAction({
  title,
  text,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon = 'question',
  confirmButtonColor,
} = {}) {
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
