import { useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth, useCart } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { getApiAuthToken } from '@/shared/api'
import {
  MIN_PRODUCT_CODES,
  parseAndValidateProductExcelFile,
} from '@/features/profile/lib/productExcel'
import {
  compareOrderWithStock,
  fetchStockByCodes,
} from '@/features/profile/api/bulkOrderApi'
import { submitBulkOrderSelection } from '@/features/profile/api/bulkContinue'
import { useExcelTemplate } from './useExcelTemplate'

/**
 * Estado y acciones de la subida masiva:
 * plantilla + Excel → JSON → comparación de stock → carrito.
 */
export function useBulkUpload({ onCancelOrder, onOrderSent } = {}) {
  const { showToast } = useToast()
  const { tokenAccess, openAuthModal } = useAuth()
  const { cartItems, refreshCartFromApi } = useCart()
  const inputRef = useRef(null)
  const cartItemsRef = useRef(cartItems)
  cartItemsRef.current = cartItems
  const tokenAccessRef = useRef(tokenAccess)
  tokenAccessRef.current = tokenAccess

  const {
    templateMatrix,
    isLoadingTemplate,
    isDownloading,
    handleDownloadTemplate,
  } = useExcelTemplate()

  const [uploadState, setUploadState] = useState({
    convertedItems: null,
    processLog: [],
    omittedLines: [],
    merges: [],
    isReading: false,
  })
  const [processState, setProcessState] = useState({
    isProcessing: false,
    isSending: false,
    progress: { done: 0, total: 0 },
    comparison: null,
    decision: null,
  })

  const hasConvertedData = Array.isArray(uploadState.convertedItems)
    && uploadState.convertedItems.length > 0

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadState((current) => ({
      ...current,
      isReading: true,
      convertedItems: null,
      processLog: [],
      omittedLines: [],
      merges: [],
    }))
    setProcessState({
      isProcessing: false,
      isSending: false,
      progress: { done: 0, total: 0 },
      comparison: null,
      decision: null,
    })

    try {
      const result = await parseAndValidateProductExcelFile(file)
      if (!result.valid) {
        showToast(result.error || 'Archivo inválido', 'error')
        return
      }

      const items = result.items || []

      setUploadState((current) => ({
        ...current,
        convertedItems: items,
        processLog: Array.isArray(result.processLog) ? result.processLog : [],
        omittedLines: Array.isArray(result.omitted) ? result.omitted : [],
        merges: Array.isArray(result.merges) ? result.merges : [],
      }))

      showToast(`Archivo convertido: ${items.length} producto(s)`, 'success')
    } catch (error) {
      showToast(error?.message || 'No se pudo leer el archivo', 'error')
    } finally {
      setUploadState((current) => ({ ...current, isReading: false }))
    }
  }

  const handleProcessOrder = async () => {
    if (!hasConvertedData || processState.isProcessing) return

    const items = uploadState.convertedItems
    if (items.length < MIN_PRODUCT_CODES) {
      showToast(
        `Se requieren al menos ${MIN_PRODUCT_CODES} líneas de código válidas`,
        'error',
      )
      return
    }

    setProcessState({
      isProcessing: true,
      isSending: false,
      progress: { done: 0, total: items.length },
      comparison: null,
      decision: null,
    })

    try {
      const stockByCode = await fetchStockByCodes(
        items.map((item) => item.codigo),
        {
          onProgress: (done, total) => {
            setProcessState((current) => ({
              ...current,
              progress: { done, total },
            }))
          },
        },
      )

      const comparison = compareOrderWithStock(items, stockByCode)
      setProcessState((current) => ({ ...current, comparison }))
      showToast('Comparación de stock completada', 'success')
    } catch (error) {
      showToast(error?.message || 'No se pudo consultar el stock', 'error')
    } finally {
      setProcessState((current) => ({ ...current, isProcessing: false }))
    }
  }

  /**
   * onlyOk=false → Continuar (Ok + con novedad)
   * onlyOk=true  → Continuar sin novedad (solo Ok)
   */
  const handleContinue = async (onlyOk) => {
    if (processState.isSending || !processState.comparison) return

    const token = tokenAccessRef.current || getApiAuthToken()
    if (!token) {
      showToast('Inicia sesión para enviar el pedido al carrito', 'error')
      openAuthModal?.()
      return
    }

    setProcessState((current) => ({ ...current, isSending: true }))

    try {
      const { emptySelection, posted, failed, excluded } = await submitBulkOrderSelection({
        results: processState.comparison.results || [],
        onlyOk,
        token,
        getExistingQty: (productId) => {
          const existing = cartItemsRef.current.find(
            (item) => String(item.id) === String(productId),
          )
          return existing ? Number(existing.quantity) || 0 : 0
        },
        onStart: (total) => {
          setProcessState((current) => ({
            ...current,
            progress: { done: 0, total },
          }))
        },
        onProgress: (done, total) => {
          setProcessState((current) => ({
            ...current,
            progress: { done, total },
          }))
        },
      })

      if (emptySelection) {
        showToast('No hay productos disponibles para el pedido', 'error')
        return
      }

      if (posted.length === 0) {
        showToast('No se pudo agregar ningún producto al carrito', 'error')
        return
      }

      await refreshCartFromApi()

      setProcessState((current) => ({
        ...current,
        decision: {
          type: onlyOk ? 'sin-novedad' : 'todos',
          items: posted,
          excluded,
          omittedLines: uploadState.omittedLines,
          merges: uploadState.merges,
        },
      }))

      if (failed.length > 0) {
        showToast(
          `Carrito: ${posted.length} agregado(s), ${failed.length} con error`,
          'warning',
        )
      } else {
        showToast(`Pedido enviado al carrito (${posted.length} producto(s))`, 'success')
      }

      onOrderSent?.()
    } catch (error) {
      showToast(error?.message || 'No se pudo enviar el pedido al carrito', 'error')
    } finally {
      setProcessState((current) => ({ ...current, isSending: false }))
    }
  }

  const handleCancelOrder = async () => {
    const confirmation = await Swal.fire({
      title: '¿Cancelar el pedido?',
      text: 'Se descartará el procesamiento actual.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
    })

    if (confirmation.isConfirmed) {
      onCancelOrder?.()
    }
  }

  const handlePrimaryAction = () => {
    if (hasConvertedData) {
      handleProcessOrder()
      return
    }
    inputRef.current?.click()
  }

  return {
    inputRef,
    uploadState: { ...uploadState, templateMatrix, isLoadingTemplate, isDownloading },
    processState,
    hasConvertedData,
    handleDownloadTemplate,
    handleFileChange,
    handleContinue,
    handleCancelOrder,
    handlePrimaryAction,
  }
}
