import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth, useCart } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { getApiAuthToken } from '@/shared/api'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import cloudUploadIcon from '@/assets/icons/cloud-upload.svg'
import {
  EXCEL_TEMPLATE_FILENAME,
  MAX_EXCEL_LINES,
  MIN_PRODUCT_CODES,
  downloadOfficialExcelTemplate,
  loadTemplateSheetMatrix,
  parseAndValidateProductExcelFile,
} from '@/features/profile/lib/productExcel'
import {
  STOCK_STATUS,
  compareOrderWithStock,
  fetchStockByCodes,
  postBulkOrderToCart,
  selectRowsExcludedFromCart,
  selectRowsForCart,
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

function InfoNotes({ omittedLines = [], merges = [] }) {
  const hasOmissions = Array.isArray(omittedLines) && omittedLines.length > 0
  const hasMerges = Array.isArray(merges) && merges.length > 0
  if (!hasOmissions && !hasMerges) return null

  return (
    <div className="bulk-upload__info-notes">
      {hasMerges ? (
        <>
          <p className="bulk-upload__info-notes-title">
            Códigos duplicados consolidados ({merges.length})
          </p>
          <ul className="bulk-upload__info-notes-list">
            {merges.map((entry) => (
              <li key={`merge-${entry.line}-${entry.codigo}`}>
                Línea {entry.line}: {entry.reason || `Código ${entry.codigo} duplicado`}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {hasOmissions ? (
        <>
          <p className="bulk-upload__info-notes-title">
            Líneas con error ({omittedLines.length})
          </p>
          <ul className="bulk-upload__info-notes-list">
            {omittedLines.map((entry) => (
              <li key={`omit-${entry.line}-${entry.reason}`}>
                Línea {entry.line}: {entry.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

/**
 * Contenedor Informacion: log, comparación de stock y notas de líneas.
 */
function InfoPanel({
  loading,
  processLog,
  comparison,
  decision,
  omittedLines = [],
  merges = [],
  isSending = false,
  onContinue,
  onCancel,
}) {
  const hasLog = Array.isArray(processLog) && processLog.length > 0
  const residualRows = Array.isArray(decision?.excluded) ? decision.excluded : []
  const residualOmissions = Array.isArray(decision?.omittedLines)
    ? decision.omittedLines
    : omittedLines
  const residualMerges = Array.isArray(decision?.merges) ? decision.merges : merges
  const hasResiduals = residualRows.length > 0
    || residualOmissions.length > 0
    || residualMerges.length > 0

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
                      {row.estado === STOCK_STATUS.OK ? (
                        <span className="bulk-upload__ok">{row.estado}</span>
                      ) : (
                        row.estado
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="bulk-upload__comparison-summary">
                <span className="bulk-upload__ok">{comparison.summary.ok} Ok</span>
                {' '}· {comparison.summary.novedad} con novedad
                {' '}· {comparison.summary.agotado} agotado(s)
              </p>

              {decision ? (
                <div className="bulk-upload__decision" role="status">
                  <p className="bulk-upload__decision-main">
                    <span className="bulk-upload__ok">Ok</span>
                    {' '}200 · Enviados al carrito: {decision.items.length} producto(s)
                    {decision.type === 'sin-novedad' ? ' (solo Ok)' : ''}
                  </p>

                  {hasResiduals ? (
                    <div className="bulk-upload__residuals">
                      <p className="bulk-upload__residuals-title">
                        No enviados / revisar
                      </p>
                      <ul className="bulk-upload__residuals-list">
                        {residualRows.map((row, index) => (
                          <li key={`ex-${index}-${row.codigo}`}>
                            {row.codigo}: {row.estado}
                            {row.estado === STOCK_STATUS.OUT
                              ? ' (sin stock)'
                              : row.stock != null && row.cantidad != null
                                ? ` · pedido ${row.cantidad} / stock ${row.stock}`
                                : ''}
                          </li>
                        ))}
                      </ul>
                      <InfoNotes
                        omittedLines={residualOmissions}
                        merges={residualMerges}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <InfoNotes omittedLines={omittedLines} merges={merges} />
                  <div className="bulk-upload__comparison-actions">
                    <button
                      type="button"
                      className="bulk-upload__btn"
                      onClick={() => onContinue(false)}
                      disabled={isSending}
                    >
                      {isSending ? 'Enviando…' : 'Continuar'}
                    </button>
                    <button
                      type="button"
                      className="bulk-upload__btn"
                      onClick={() => onContinue(true)}
                      disabled={isSending}
                    >
                      Continuar sin novedad
                    </button>
                    <button
                      type="button"
                      className="bulk-upload__btn"
                      onClick={onCancel}
                      disabled={isSending}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : hasLog ? (
            <div className="bulk-upload__process-block">
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
              <InfoNotes omittedLines={omittedLines} merges={merges} />
            </div>
          ) : (
            <p className="bulk-upload__sheet-status">Sin información</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Subida masiva de pedido: plantilla + Excel → JSON → comparación de stock → carrito.
 */
export function BulkUploadFileContent({ onCancelOrder, onOrderSent } = {}) {
  const { showToast } = useToast()
  const { tokenAccess, openAuthModal } = useAuth()
  const { cartItems, refreshCartFromApi } = useCart()
  const inputRef = useRef(null)
  const cartItemsRef = useRef(cartItems)
  cartItemsRef.current = cartItems
  const tokenAccessRef = useRef(tokenAccess)
  tokenAccessRef.current = tokenAccess

  const [uploadState, setUploadState] = useState({
    templateMatrix: [],
    isLoadingTemplate: true,
    convertedItems: null,
    processLog: [],
    omittedLines: [],
    merges: [],
    isReading: false,
    isDownloading: false,
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
  const isBusy = uploadState.isReading
    || processState.isProcessing
    || processState.isSending
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
          showToast(error?.message || 'No se pudo cargar la plantilla Excel', 'error')
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
      const omittedLines = Array.isArray(result.omitted) ? result.omitted : []
      const merges = Array.isArray(result.merges) ? result.merges : []

      setUploadState((current) => ({
        ...current,
        convertedItems: items,
        processLog: Array.isArray(result.processLog) ? result.processLog : [],
        omittedLines,
        merges,
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
      openAuthModal?.('login')
      return
    }

    const results = processState.comparison.results || []
    const selected = selectRowsForCart(results, { onlyOk })
    const excluded = selectRowsExcludedFromCart(results, { onlyOk })

    if (selected.length === 0) {
      showToast('No hay productos disponibles para el pedido', 'error')
      return
    }

    setProcessState((current) => ({
      ...current,
      isSending: true,
      progress: { done: 0, total: selected.length },
    }))

    try {
      const { posted, failed } = await postBulkOrderToCart(selected, {
        token,
        getExistingQty: (productId) => {
          const existing = cartItemsRef.current.find(
            (item) => String(item.id) === String(productId),
          )
          return existing ? Number(existing.quantity) || 0 : 0
        },
        onProgress: (done, total) => {
          setProcessState((current) => ({
            ...current,
            progress: { done, total },
          }))
        },
      })

      if (posted.length === 0) {
        showToast('No se pudo agregar ningún producto al carrito', 'error')
        return
      }

      await refreshCartFromApi()

      const failedAsExcluded = failed.map((entry) => ({
        codigo: entry.codigo,
        estado: entry.reason || 'error',
        cantidad: 0,
        stock: 0,
      }))

      setProcessState((current) => ({
        ...current,
        decision: {
          type: onlyOk ? 'sin-novedad' : 'todos',
          items: posted,
          excluded: [...excluded, ...failedAsExcluded],
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

  const { progress } = processState
  const progressPercent = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  const primaryLabel = (() => {
    if (uploadState.isReading) return 'Convirtiendo…'
    if (processState.isProcessing) {
      return `Procesando… ${progress.done}/${progress.total}`
    }
    if (processState.isSending) {
      return `Enviando… ${progress.done}/${progress.total}`
    }
    if (hasConvertedData) return 'Procesar pedido'
    return 'Cargar archivo'
  })()

  const showUploadIcon = !hasConvertedData
    && !uploadState.isReading
    && !processState.isProcessing
    && !processState.isSending

  return (
    <div className="bulk-upload">
      <p className="bulk-upload__hint">
        El archivo debe respetar el formato de <strong>{EXCEL_TEMPLATE_FILENAME}</strong>
        {' '}
        (<strong>Codigo</strong>, <strong>cantidad</strong>).
        Mínimo <strong>{MIN_PRODUCT_CODES}</strong> códigos · máximo <strong>{MAX_EXCEL_LINES}</strong> líneas.
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
                className="bulk-upload__btn-icon"
                aria-hidden="true"
              />
              {uploadState.isDownloading ? 'Descargando…' : 'Descargar plantilla'}
            </span>
          </button>
        ) : null}
        {showProcessButton ? (
          <button
            type="button"
            className={`bulk-upload__btn${processState.isProcessing || processState.isSending ? ' bulk-upload__btn--progress' : ''}`}
            onClick={handlePrimaryAction}
            disabled={isBusy}
            aria-busy={isBusy}
          >
            {processState.isProcessing || processState.isSending ? (
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
            ) : showUploadIcon ? (
              <span className="bulk-upload__btn-content">
                <img
                  src={cloudUploadIcon}
                  alt=""
                  className="bulk-upload__btn-icon"
                  aria-hidden="true"
                />
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

      {showInfoPanel ? (
        <InfoPanel
          loading={uploadState.isReading}
          processLog={uploadState.processLog}
          comparison={processState.comparison}
          decision={processState.decision}
          omittedLines={uploadState.omittedLines}
          merges={uploadState.merges}
          isSending={processState.isSending}
          onContinue={handleContinue}
          onCancel={handleCancelOrder}
        />
      ) : null}
    </div>
  )
}
