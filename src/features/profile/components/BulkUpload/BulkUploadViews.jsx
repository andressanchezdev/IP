import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { useToast } from '@/app/providers/ToastProvider'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import {
  EXCEL_TEMPLATE_FILENAME,
  MAX_EXCEL_LINES,
  downloadOfficialExcelTemplate,
  loadTemplateSheetMatrix,
  parseAndValidateProductExcelFile,
} from '@/features/profile/lib/productExcel'
import {
  STOCK_STATUS,
  compareOrderWithStock,
  fetchStockByCodes,
} from '@/features/profile/api/bulkOrderApi'
import './BulkUpload.css'

/**
 * Ventana tipo Excel (plantilla): solo columnas Codigo y cantidad.
 */
function ExcelWindowPreview({ matrix, caption, loading = false, emptyText = 'Sin datos' }) {
  const hasRows = Array.isArray(matrix) && matrix.length > 0
  const colCount = hasRows
    ? Math.max(...matrix.map((row) => (Array.isArray(row) ? row.length : 0)), 2)
    : 2

  return (
    <div className="bulk-upload__table-wrap" data-excel-preview>
      <div className="bulk-upload__excel-window" role="region" aria-label={caption || 'Vista Excel'}>
        <div className="bulk-upload__excel-titlebar">
          <span className="bulk-upload__excel-title">
            {caption || EXCEL_TEMPLATE_FILENAME}
          </span>
        </div>
        <div className="bulk-upload__excel-toolbar">
          <span>Hoja 1</span>
        </div>
        <div className="bulk-upload__excel-body">
          {loading ? (
            <p className="bulk-upload__sheet-status">Cargando Excel…</p>
          ) : !hasRows ? (
            <p className="bulk-upload__sheet-status">{emptyText}</p>
          ) : (
            <div
              className="bulk-upload__sheet"
              style={{ '--excel-cols': colCount }}
              role="table"
            >
              {matrix.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className={`bulk-upload__sheet-row ${rowIndex === 0 ? 'bulk-upload__sheet-row--head' : ''}`}
                  role="row"
                >
                  {(Array.isArray(row) ? row : []).map((cell, cellIndex) => (
                    <div
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className="bulk-upload__sheet-cell"
                      role={rowIndex === 0 ? 'columnheader' : 'cell'}
                    >
                      {String(cell ?? '')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const STATUS_MODIFIER = {
  [STOCK_STATUS.OK]: 'ok',
  [STOCK_STATUS.SHORT]: 'short',
  [STOCK_STATUS.OUT]: 'out',
}

/**
 * Contenedor Informacion: log OK (200) o resultado de comparación de stock.
 */
function InfoPanel({
  loading,
  processLog,
  comparison,
  decision,
  onContinue,
  onCancel,
}) {
  const hasLog = Array.isArray(processLog) && processLog.length > 0

  return (
    <div className="bulk-upload__table-wrap bulk-upload__table-wrap--fill" data-process-log>
      <div className="bulk-upload__excel-window" role="region" aria-label="Informacion">
        <div className="bulk-upload__excel-titlebar">
          <span className="bulk-upload__excel-title">Informacion</span>
        </div>
        <div className="bulk-upload__excel-body">
          {loading ? (
            <div className="bulk-upload__process-loading" role="status">
              <span className="bulk-upload__spinner" aria-hidden="true" />
              <p className="bulk-upload__sheet-status">Convirtiendo…</p>
            </div>
          ) : comparison ? (
            <div className="bulk-upload__comparison">
              <ul className="bulk-upload__comparison-list">
                {comparison.results.map((row, index) => (
                  <li
                    key={`cmp-${index}-${row.codigo}`}
                    className="bulk-upload__comparison-item"
                  >
                    <span className="bulk-upload__comparison-code">{row.codigo}</span>
                    <span className="bulk-upload__comparison-qty">
                      {row.cantidad} / {row.stock} stock
                    </span>
                    <span
                      className={`bulk-upload__status bulk-upload__status--${STATUS_MODIFIER[row.estado]}`}
                    >
                      {row.estado}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="bulk-upload__comparison-summary">
                {comparison.summary.ok} sin novedad · {comparison.summary.novedad} con novedad
                {' '}· {comparison.summary.agotado} agotado(s)
              </p>

              {decision ? (
                <p className="bulk-upload__decision" role="status">
                  <span className="bulk-upload__ok">OK</span>
                  {' '}200 · Pedido preparado ({decision.items.length} producto(s)
                  {decision.type === 'con-novedad' ? ', con novedad' : ', sin novedad'})
                </p>
              ) : (
                <div className="bulk-upload__comparison-actions">
                  <button
                    type="button"
                    className="bulk-upload__btn"
                    onClick={() => onContinue(false)}
                  >
                    Continuar sin novedad
                  </button>
                  <button
                    type="button"
                    className="bulk-upload__btn"
                    onClick={() => onContinue(true)}
                  >
                    Continuar con novedad
                  </button>
                  <button
                    type="button"
                    className="bulk-upload__btn"
                    onClick={onCancel}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ) : hasLog ? (
            <ul className="bulk-upload__process-list">
              {processLog.map((entry, index) => (
                <li
                  key={`process-${index}-${entry.code}-${entry.message}`}
                  className="bulk-upload__process-item"
                >
                  <span className="bulk-upload__process-code">
                    <span className="bulk-upload__ok">OK</span>
                    {' '}{entry.code ?? 200}
                  </span>
                  <span className="bulk-upload__process-message">{entry.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bulk-upload__sheet-status">Sin información</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Subida masiva de pedido: plantilla + Excel → JSON → comparación de stock.
 */
export function BulkUploadFileContent({ onCancelOrder } = {}) {
  const { showToast } = useToast()
  const inputRef = useRef(null)
  const [uploadState, setUploadState] = useState({
    templateMatrix: [],
    isLoadingTemplate: true,
    convertedItems: null,
    processLog: [],
    omittedLines: [],
    isReading: false,
    isDownloading: false,
  })
  const [processState, setProcessState] = useState({
    isProcessing: false,
    progress: { done: 0, total: 0 },
    comparison: null,
    decision: null,
  })

  const hasConvertedData = Array.isArray(uploadState.convertedItems)
    && uploadState.convertedItems.length > 0
  const isBusy = uploadState.isReading || processState.isProcessing
  const hasComparison = Boolean(processState.comparison)
  const showTemplate = !hasComparison
  const showProcessButton = !hasComparison
  const showInfoPanel = uploadState.isReading
    || uploadState.processLog.length > 0
    || hasComparison

  useEffect(() => {
    let cancelled = false

    loadTemplateSheetMatrix()
      .then((matrix) => {
        if (!cancelled) {
          setUploadState((current) => ({
            ...current,
            templateMatrix: matrix,
            isLoadingTemplate: false,
          }))
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setUploadState((current) => ({ ...current, isLoadingTemplate: false }))
          showToast(error?.message || 'No se pudo cargar formatoexel.xlsx', 'error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [showToast])

  const handleDownloadTemplate = async () => {
    setUploadState((current) => ({ ...current, isDownloading: true }))
    try {
      await downloadOfficialExcelTemplate()
      showToast('Plantilla descargada', 'success')
    } catch (error) {
      showToast(error?.message || 'No se pudo descargar la plantilla', 'error')
    } finally {
      setUploadState((current) => ({ ...current, isDownloading: false }))
    }
  }

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
    }))
    setProcessState({
      isProcessing: false,
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
      const omittedLines = Array.isArray(result.omitted) ? result.omitted : []

      setUploadState((current) => ({
        ...current,
        convertedItems: items,
        processLog: Array.isArray(result.processLog) ? result.processLog : [],
        omittedLines,
      }))

      if (omittedLines.length > 0) {
        showToast(
          `Convertidos ${items.length}. Se omitieron ${omittedLines.length} línea(s)`,
          'warning',
        )
      } else {
        showToast(`Archivo convertido: ${items.length} producto(s)`, 'success')
      }
    } catch (error) {
      showToast(error?.message || 'No se pudo leer el archivo', 'error')
    } finally {
      setUploadState((current) => ({ ...current, isReading: false }))
    }
  }

  const handleProcessOrder = async () => {
    if (!hasConvertedData || processState.isProcessing) return

    const items = uploadState.convertedItems
    setProcessState({
      isProcessing: true,
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

  const handleContinue = (withNovedad) => {
    const results = processState.comparison?.results || []
    const selected = withNovedad
      ? results.filter((row) => row.estado !== STOCK_STATUS.OUT)
      : results.filter((row) => row.estado === STOCK_STATUS.OK)

    if (selected.length === 0) {
      showToast('No hay productos disponibles para el pedido', 'error')
      return
    }

    // Punto de integración: JSON final listo para la API de pedido masivo.
    const orderItems = selected.map(({ codigo, cantidad }) => ({
      codigo,
      cantidad: String(cantidad),
    }))

    setProcessState((current) => ({
      ...current,
      decision: {
        type: withNovedad ? 'con-novedad' : 'sin-novedad',
        items: orderItems,
      },
    }))
    showToast(`Pedido preparado (${orderItems.length} producto(s))`, 'success')
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

  const { progress } = processState
  const progressPercent = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  const primaryLabel = (() => {
    if (uploadState.isReading) return 'Convirtiendo…'
    if (processState.isProcessing) {
      return `Procesando… ${progress.done}/${progress.total}`
    }
    if (hasConvertedData) return 'Procesar pedido'
    return 'Cargar archivo'
  })()

  return (
    <div className="bulk-upload">
      <p className="bulk-upload__hint">
        El archivo debe respetar el formato de <strong>{EXCEL_TEMPLATE_FILENAME}</strong>
        {' '}
        (<strong>Codigo</strong>, <strong>cantidad</strong>). Máximo <strong>{MAX_EXCEL_LINES}</strong> líneas.
      </p>

      {showTemplate ? (
        <ExcelWindowPreview
          matrix={uploadState.templateMatrix}
          caption={EXCEL_TEMPLATE_FILENAME}
          loading={uploadState.isLoadingTemplate}
        />
      ) : null}

      <div className="bulk-upload__actions">
        {!uploadState.isReading && !hasConvertedData ? (
          <button
            type="button"
            className="bulk-upload__btn"
            onClick={handleDownloadTemplate}
            disabled={uploadState.isDownloading || isBusy}
          >
            <span className="bulk-upload__btn-content">
              <img
                src={cloudDownloadIcon}
                alt=""
                className="bulk-upload__download-icon"
                aria-hidden="true"
              />
              {uploadState.isDownloading ? 'Descargando…' : 'Descargar plantilla'}
            </span>
          </button>
        ) : null}
        {showProcessButton ? (
          <button
            type="button"
            className={`bulk-upload__btn${processState.isProcessing ? ' bulk-upload__btn--progress' : ''}`}
            onClick={handlePrimaryAction}
            disabled={isBusy}
            aria-busy={isBusy}
          >
            {processState.isProcessing ? (
              <>
                <span
                  className="bulk-upload__btn-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                  aria-hidden="true"
                />
                <span className="bulk-upload__btn-content">{primaryLabel}</span>
              </>
            ) : uploadState.isReading ? (
              <span className="bulk-upload__btn-content">
                <span className="bulk-upload__spinner bulk-upload__spinner--light" aria-hidden="true" />
                {primaryLabel}
              </span>
            ) : (
              primaryLabel
            )}
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="bulk-upload__file-input"
          onChange={handleFileChange}
        />
      </div>

      {uploadState.omittedLines.length > 0 ? (
        <div className="bulk-upload__omissions" role="status">
          <p className="bulk-upload__omissions-title">
            Se omitieron {uploadState.omittedLines.length} línea(s)
          </p>
          <ul className="bulk-upload__omissions-list">
            {uploadState.omittedLines.map((entry) => (
              <li key={`omit-${entry.line}-${entry.reason}`}>
                Línea {entry.line}: {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showInfoPanel ? (
        <InfoPanel
          loading={uploadState.isReading}
          processLog={uploadState.processLog}
          comparison={processState.comparison}
          decision={processState.decision}
          onContinue={handleContinue}
          onCancel={handleCancelOrder}
        />
      ) : null}
    </div>
  )
}
