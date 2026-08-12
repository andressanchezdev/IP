import { EXCEL_TEMPLATE_FILENAME } from '@/features/profile/lib/productExcel'

/**
 * Ventana tipo Excel (plantilla): solo columnas Codigo y cantidad.
 */
export function ExcelWindowPreview({ matrix, caption, loading = false, emptyText = 'Sin datos' }) {
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
