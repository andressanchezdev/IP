import { formatPrice } from '@/shared/lib/formatPrice'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { useActionLock } from '@/shared/lib/useActionLock'
import { resolveEstadoBadgeTone } from '@/features/orders/constants/orderSteps'
import {
  getCreditRemainingForNewAbono,
} from '@/features/orders/constants/abonoStatus'
import { PAYMENT_LIMIT_MISSING_MESSAGE } from '@/features/orders/utils/resolvePaymentDeadline'
import eyeIcon from '@/assets/icons/eye.svg'

/** Misma regla que order-payment__add-btn: hay cupo para un nuevo abono. */
function canCreateAbono(order) {
  const total = Number(order?.total ?? order?.payment?.amount ?? 0)
  const payments = order?.payment?.payments ?? []
  return getCreditRemainingForNewAbono(total, payments) > 0
}

function resolveOrderActionId(order) {
  const fromId = String(order?.id ?? '').trim()
  if (fromId) {
    return fromId
  }
  const fromVenta = String(order?.idventa ?? '').trim()
  if (fromVenta) {
    return fromVenta
  }
  return String(order?.claveVenta ?? order?.clave_venta ?? '').trim()
}

function HistoryRowActions({ order, actionOrderId, allowAbono, abonosCount, onCreateAbono, onViewAbonos }) {
  const { busy, run } = useActionLock()

  return (
    <div className="historial-acciones">
      <button
        type="button"
        className="historial-view-abonos-btn"
        disabled={!actionOrderId || busy}
        onClick={() => {
          if (!actionOrderId) return
          void run(async () => {
            onViewAbonos?.(actionOrderId)
          })
        }}
        {...namedControl(
          abonosCount > 0
            ? `Ver abonos pedido ${order.idventa} (${abonosCount})`
            : `Ver información de pago pedido ${order.idventa}`,
        )}
      >
        <img
          src={eyeIcon}
          className="historial-view-abonos-btn__icon"
          {...namedImage('Ver abonos')}
        />
      </button>
      <button
        type="button"
        className="historial-abono-btn"
        disabled={!allowAbono || !actionOrderId || busy}
        onClick={() => {
          if (!allowAbono || !actionOrderId) return
          void run(async () => {
            onCreateAbono?.(actionOrderId)
          })
        }}
        {...namedControl(
          allowAbono
            ? `Crear abono pedido ${order.idventa}`
            : `No disponible crear abono pedido ${order.idventa}`,
        )}
      >
        +
      </button>
    </div>
  )
}

export function HistoryView({
  historyOrders,
  filteredOrders,
  isLoading = false,
  errorMessage = '',
  onCreateAbono,
  onViewAbonos,
}) {
  return (
    <section className="landing__panel">
      <div className="landing__table-outer">
        <div className="landing__table-wrap">
          <table className="landing__table landing__table--historial">
            <thead>
              <tr>
                {/* Prioridad visual: Pedido, Medio pago, Estado, Acción */}
                <th className="landing__table-col landing__table-col--priority">ID Pedido</th>
                <th className="landing__table-col landing__table-col--priority">Medio pago</th>
                <th className="landing__table-col landing__table-col--priority">Estado</th>
                <th className="landing__table-col landing__table-col--secondary">Fecha</th>
                <th className="landing__table-col landing__table-col--secondary">Fecha límite</th>
                <th className="landing__table-col landing__table-col--secondary">Valor</th>
                <th className="landing__table-col landing__table-col--priority">Acción</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="landing__table-row--status">
                  <td colSpan="7" className="landing__table-empty">Cargando cartera...</td>
                </tr>
              ) : errorMessage ? (
                <tr className="landing__table-row--status">
                  <td colSpan="7" className="landing__table-empty">{errorMessage}</td>
                </tr>
              ) : historyOrders.length === 0 ? (
                <tr className="landing__table-row--status">
                  <td colSpan="7" className="landing__table-empty">No hay créditos registrados.</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr className="landing__table-row--status">
                  <td colSpan="7" className="landing__table-empty">Sin registros encontrados.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const dateLimitLabel = order.dateLimitLabel || PAYMENT_LIMIT_MISSING_MESSAGE
                  const isMissingLimit = dateLimitLabel === PAYMENT_LIMIT_MISSING_MESSAGE
                  const estadoLabel = String(order.estado || '').trim() || '—'
                  const badgeTone = resolveEstadoBadgeTone(order.estado)
                  const allowAbono = canCreateAbono(order)
                  const actionOrderId = resolveOrderActionId(order)
                  const abonosCount = (order?.payment?.payments ?? []).length

                  return (
                    <tr key={order.idventa ?? actionOrderId} className="landing__table-row--order">
                      <td className="landing__table-col landing__table-col--priority" data-label="id Pedido">
                        {order.idventa}
                      </td>
                      <td className="landing__table-col landing__table-col--priority" data-label="Medio pago">
                        {order.metodo_pago}
                      </td>
                      <td className="landing__table-col landing__table-col--priority" data-label="Estado">
                        <span className={`historial-estado-badge historial-estado-badge--${badgeTone}`}>
                          {estadoLabel}
                        </span>
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Fecha">
                        {order.fecha}
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Fecha límite">
                        <span
                          className={
                            isMissingLimit
                              ? 'historial-date-limit historial-date-limit--missing'
                              : 'historial-date-limit'
                          }
                        >
                          {dateLimitLabel}
                        </span>
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Valor">
                        {formatPrice(order.total)}
                      </td>
                      <td className="landing__table-col landing__table-col--priority" data-label="Acción">
                        <HistoryRowActions
                          order={order}
                          actionOrderId={actionOrderId}
                          allowAbono={allowAbono}
                          abonosCount={abonosCount}
                          onCreateAbono={onCreateAbono}
                          onViewAbonos={onViewAbonos}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
