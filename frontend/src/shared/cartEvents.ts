export const CART_UPDATED_EVENT = 'craftsphere:cart-updated'

export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}
