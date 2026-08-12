import { STOCK_STATUS } from '@/features/profile/api/bulkOrderApi'

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
export function InfoPanel({
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
