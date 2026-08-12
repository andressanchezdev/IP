import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import cloudUploadIcon from '@/assets/icons/cloud-upload.svg'
import {
  EXCEL_TEMPLATE_FILENAME,
  MAX_EXCEL_LINES,
  MIN_PRODUCT_CODES,
} from '@/features/profile/lib/productExcel'
import { ExcelWindowPreview } from './ExcelWindowPreview'
import { InfoPanel } from './BulkUploadInfoPanel'
import { useBulkUpload } from './useBulkUpload'
import './BulkUpload.css'

/**
 * Subida masiva de pedido: plantilla + Excel → JSON → comparación de stock → carrito.
 */
export function BulkUploadFileContent({ onCancelOrder, onOrderSent } = {}) {
  const {
    inputRef,
    uploadState,
    processState,
    hasConvertedData,
    handleDownloadTemplate,
    handleFileChange,
    handleContinue,
    handleCancelOrder,
    handlePrimaryAction,
  } = useBulkUpload({ onCancelOrder, onOrderSent })

  const isBusy = uploadState.isReading
    || processState.isProcessing
    || processState.isSending
  const hasComparison = Boolean(processState.comparison)
  const showTemplate = !hasComparison
  const showProcessButton = !hasComparison
  const showInfoPanel = uploadState.isReading
    || uploadState.processLog.length > 0
    || hasComparison

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
