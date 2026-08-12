import { useEffect, useState } from 'react'
import { useToast } from '@/app/providers/ToastProvider'
import {
  downloadOfficialExcelTemplate,
  loadTemplateSheetMatrix,
} from '@/features/profile/lib/productExcel'

/** Carga la vista previa de la plantilla oficial y gestiona su descarga. */
export function useExcelTemplate() {
  const { showToast } = useToast()
  const [templateMatrix, setTemplateMatrix] = useState([])
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadTemplateSheetMatrix()
      .then((matrix) => {
        if (!cancelled) {
          setTemplateMatrix(matrix)
          setIsLoadingTemplate(false)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setIsLoadingTemplate(false)
          showToast(error?.message || 'No se pudo cargar la plantilla Excel', 'error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [showToast])

  const handleDownloadTemplate = async () => {
    setIsDownloading(true)
    try {
      await downloadOfficialExcelTemplate()
      showToast('Plantilla descargada', 'success')
    } catch (error) {
      showToast(error?.message || 'No se pudo descargar la plantilla', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    templateMatrix,
    isLoadingTemplate,
    isDownloading,
    handleDownloadTemplate,
  }
}
