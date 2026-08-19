import { formatPrice } from '@/shared/lib/formatPrice'

export function HistoryView({ historyOrders, filteredOrders, isLoading = false, errorMessage = '' }) {
  return (
    <section className="landing__panel">
      <div className="landing__panel-header">
        <h2>Historial de compras</h2>
        <p>Resumen completo de todos los pedidos realizados.</p>
      </div>

      <div className="landing__table-wrap">
        <table className="landing__table landing__table--historial">
          <thead>
            <tr>
              <th className="landing__table-col landing__table-col--priority">#Pedido</th>
              <th className="landing__table-col landing__table-col--priority">Fecha</th>
              <th className="landing__table-col landing__table-col--secondary">Fecha límite</th>
              <th className="landing__table-col landing__table-col--secondary">Productos</th>
              <th className="landing__table-col landing__table-col--secondary">Medio pago</th>
              <th className="landing__table-col landing__table-col--secondary">Valor</th>
              <th className="landing__table-col landing__table-col--priority">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="landing__table-empty">Cargando historial...</td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan="7" className="landing__table-empty">{errorMessage}</td>
              </tr>
            ) : historyOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="landing__table-empty">No hay órdenes registradas.</td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="landing__table-empty">No se encontraron pedidos con esos criterios.</td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.idventa}>
                  <td className="landing__table-col landing__table-col--priority" data-label="#Pedido">
                    {order.idventa}
                  </td>
                  <td className="landing__table-col landing__table-col--priority" data-label="Fecha">
                    {order.fecha}
                  </td>
                  <td className="landing__table-col landing__table-col--secondary" data-label="Fecha límite">
                    -
                  </td>
                  <td className="landing__table-col landing__table-col--secondary" data-label="Productos">
                    {order.venta.map((item) => `IDPR ${item.idpr} x${item.cant}`).join(', ')}
                  </td>
                  <td className="landing__table-col landing__table-col--secondary" data-label="Medio pago">
                    {order.metodo_pago}
                  </td>
                  <td className="landing__table-col landing__table-col--secondary" data-label="Valor">
                    {formatPrice(order.total)}
                  </td>
                  <td className="landing__table-col landing__table-col--priority" data-label="Estado">
                    {order.estado}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
