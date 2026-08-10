import { PendingOrderCard, useShowEsperaVisual } from '@/features/orders/components/PendingOrderCard/PendingOrderCard'
import '@/features/orders/components/PendingOrderCard/PendingOrderCard.css'

export function PendingOrdersView({ pendingOrders, filteredOrders, onOpenOrder }) {
  const showEsperaVisual = useShowEsperaVisual()

  return (
    <div className="content-main-espera">
      {pendingOrders.length === 0 ? (
        <div className="landing__empty-state">Aún no hay pedidos en espera.</div>
      ) : filteredOrders.length === 0 ? (
        <div className="landing__empty-state">No se encontraron pedidos con ese número.</div>
      ) : (
        <div className="content-main-espera__list">
          {filteredOrders.map((order) => (
            <PendingOrderCard
              key={order.id}
              order={order}
              onOpenOrder={onOpenOrder}
              showVisual={showEsperaVisual}
            />
          ))}
        </div>
      )}
    </div>
  )
}
