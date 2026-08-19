import { useState } from 'react'
import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { CheckoutDeliveryMap } from './CheckoutDeliveryMap'
import { namedControl } from '@/shared/lib/namedControl'
import { FieldHint } from '@/shared/ui/FieldHint/FieldHint'
import '@/shared/ui/FieldHint/FieldHint.css'

const PANEL_REGISTERED = 'registered'
const PANEL_NEW = 'new'
const PANEL_MAP = 'map'

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
  const [openPanel, setOpenPanel] = useState(PANEL_REGISTERED)

  const toggle = (panel) => setOpenPanel((current) => (current === panel ? null : panel))

  const registeredHint = registeredAddresses.length === 0
    ? 'No hay direcciones registradas. Agregue una nueva o use el mapa.'
    : !selectedAddressId
      ? 'Seleccione una dirección registrada'
      : ''
  const newAddressHint = newAddress.trim()
    ? ''
    : 'La nueva dirección es obligatoria (calle, número, ciudad)'
  const mapHint = mapLocation?.address
    ? ''
    : 'Seleccione un punto en el mapa para confirmar la entrega'

  return (
    <Accordion title="Entrega" defaultOpen>
      <div className="checkout-finalize__box">
        <Accordion
          title="1. Direcciones registradas"
          isOpen={openPanel === PANEL_REGISTERED}
          onToggle={() => toggle(PANEL_REGISTERED)}
        >
          <div className="checkout-finalize__options">
            {registeredAddresses.map((entry, index) => (
              <label key={entry.id ?? entry.label ?? index} className="checkout-finalize__option">
                <input
                  type="radio"
                  name="registered-address"
                  checked={selectedAddressId === (entry.id ?? entry.label)}
                  onChange={() => onSelectAddress(entry.id ?? entry.label)}
                  {...namedControl(`Dirección ${entry.label}`)}
                />
                <span>
                  <strong>{entry.label}</strong>
                  <small>{entry.address}</small>
                </span>
              </label>
            ))}
            <FieldHint message={registeredHint} />
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmRegistered}
              disabled={registeredAddresses.length === 0}
              {...namedControl('Establecer dirección registrada')}
            >
              Establecer dirección
            </button>
          </div>
        </Accordion>

        <Accordion
          title="2. Agregar una nueva dirección de entrega"
          isOpen={openPanel === PANEL_NEW}
          onToggle={() => toggle(PANEL_NEW)}
        >
          <label className="order-payments-panel__field">
            <span>Nueva dirección</span>
            <input
              type="text"
              value={newAddress}
              onChange={(event) => onNewAddressChange(event.target.value)}
              placeholder="Calle, número, ciudad"
              className={newAddressHint ? 'order-payments-panel__input--error' : ''}
              aria-invalid={Boolean(newAddressHint)}
              {...namedControl('Nueva dirección')}
            />
            <FieldHint id="checkout-new-address-hint" message={newAddressHint} />
          </label>
          <button
            type="button"
            className="content-main-data-carrito__checkout"
            onClick={onConfirmNew}
            {...namedControl('Establecer nueva dirección')}
          >
            Establecer dirección
          </button>
        </Accordion>

        <Accordion
          title="3. Elegir dirección de entrega en el mapa"
          isOpen={openPanel === PANEL_MAP}
          onToggle={() => toggle(PANEL_MAP)}
        >
          <CheckoutDeliveryMap onLocationChange={onMapLocationChange} />
          {mapLocation?.address ? (
            <p className="order-payments-panel__quota">Seleccionada: {mapLocation.address}</p>
          ) : (
            <FieldHint message={mapHint} />
          )}
          <button
            type="button"
            className="content-main-data-carrito__checkout"
            onClick={onConfirmMap}
            disabled={!mapLocation?.address}
            {...namedControl('Confirmar ubicación')}
          >
            Confirmar ubicación
          </button>
        </Accordion>
      </div>
    </Accordion>
  )
}
