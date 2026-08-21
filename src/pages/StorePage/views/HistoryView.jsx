import { formatPrice } from '@/shared/lib/formatPrice'
import { resolveEstadoBadgeTone } from '@/features/orders/constants/orderSteps'
import { PAYMENT_LIMIT_MISSING_MESSAGE } from '@/features/orders/utils/resolvePaymentDeadline'

export function HistoryView({
  historyOrders,
  filteredOrders,
  isLoading = false,
  errorMessage = '',
}) {
  return (
    <section className="landing__panel">
      <div className="landing__table-outer">
        <div className="landing__table-wrap">
          <table className="landing__table landing__table--historial">
            <thead>
              <tr>
                <th className="landing__table-col landing__table-col--priority">Pedido</th>
                <th className="landing__table-col landing__table-col--priority">Fecha</th>
                <th className="landing__table-col landing__table-col--secondary">Fecha límite</th>
                <th className="landing__table-col landing__table-col--secondary">Medio pago</th>
                <th className="landing__table-col landing__table-col--secondary">Valor</th>
                <th className="landing__table-col landing__table-col--priority">Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="landing__table-empty">Cargando cartera...</td>
                </tr>
              ) : errorMessage ? (
                <tr>
                  <td colSpan="6" className="landing__table-empty">{errorMessage}</td>
                </tr>
              ) : historyOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="landing__table-empty">No hay créditos registrados.</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="landing__table-empty">Sin registros encontrados.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const dateLimitLabel = order.dateLimitLabel || PAYMENT_LIMIT_MISSING_MESSAGE
                  const isMissingLimit = dateLimitLabel === PAYMENT_LIMIT_MISSING_MESSAGE
                  const estadoLabel = String(order.estado || '').trim() || '—'
                  const badgeTone = resolveEstadoBadgeTone(order.estado)

                  return (
                    <tr key={order.idventa}>
                      <td className="landing__table-col landing__table-col--priority" data-label="#Pedido">
                        {order.idventa}
                      </td>
                      <td className="landing__table-col landing__table-col--priority" data-label="Fecha">
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
                      <td className="landing__table-col landing__table-col--secondary" data-label="Medio pago">
                        {order.metodo_pago}
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Valor">
                        {formatPrice(order.total)}
                      </td>
                      <td className="landing__table-col landing__table-col--priority" data-label="Estado">
                        <span className={`historial-estado-badge historial-estado-badge--${badgeTone}`}>
                          {estadoLabel}
                        </span>
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
