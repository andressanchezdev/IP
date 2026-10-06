/** Setters registrados por la UI. El socket no los posee y nadie más cierra la conexión. */
const slots = {
  products: null,
  search: null,
  latest: null,
  filtered: null,
  cart: null,
  cartItems: null,
  pendingOrders: null,
  historyOrders: null,
  credit: null,
}

export function bindRealtimeSlot(name, setter) {
  if (!Object.prototype.hasOwnProperty.call(slots, name)) return () => {}
  slots[name] = setter
  return () => {
    if (slots[name] === setter) slots[name] = null
  }
}

export function getRealtimeSlot(name) {
  return slots[name]
}

export function listRealtimeSlots() {
  return Object.keys(slots)
}
