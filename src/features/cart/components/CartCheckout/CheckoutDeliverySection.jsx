import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { CheckoutDeliveryMap } from './CheckoutDeliveryMap'

export function CheckoutDeliverySection({
  registeredAddresses,
  selectedAddressId,
  onSelectAddress,
  newAddress,
  onNewAddressChange,
  mapLocation,
  onMapLocationChange,
  onConfirmRegistered,
  onConfirmNew,
  onConfirmMap,
}) {
  return (
    <Accordion title="Entrega" defaultOpen>
      <div className="checkout-finalize__box">
        <Accordion title="1. Direcciones registradas" defaultOpen>
          <div className="checkout-finalize__options">
            {registeredAddresses.map((entry) => (
              <label key={entry.id} className="checkout-finalize__option">
                <input
                  type="radio"
                  name="registered-address"
                  checked={selectedAddressId === entry.id}
                  onChange={() => onSelectAddress(entry.id)}
                />
                <span>
                  <strong>{entry.label}</strong>
                  <small>{entry.address}</small>
                </span>
              </label>
            ))}
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmRegistered}
              disabled={registeredAddresses.length === 0}
            >
              Establecer dirección
            </button>
          </div>
        </Accordion>

        <Accordion title="2. Agregar una nueva dirección de entrega">
          <label className="order-payments-panel__field">
            <span>Nueva dirección</span>
            <input
              type="text"
              value={newAddress}
              onChange={(event) => onNewAddressChange(event.target.value)}
              placeholder="Calle, número, ciudad"
            />
          </label>
          <button
            type="button"
            className="content-main-data-carrito__checkout"
            onClick={onConfirmNew}
          >
            Establecer dirección
          </button>
        </Accordion>

        <Accordion title="3. Elegir dirección de entrega en el mapa">
          <p className="order-payments-panel__intro">
            Seleccione la ubicación de entrega en el mapa. Se usará la posición confirmada para el despacho.
          </p>
          <CheckoutDeliveryMap onLocationChange={onMapLocationChange} />
          {mapLocation?.address ? (
            <p className="order-payments-panel__quota">Seleccionada: {mapLocation.address}</p>
          ) : null}
          <button
            type="button"
            className="content-main-data-carrito__checkout"
            onClick={onConfirmMap}
            disabled={!mapLocation?.address}
          >
            Confirmar ubicación
          </button>
        </Accordion>
      </div>
    </Accordion>
  )
}
