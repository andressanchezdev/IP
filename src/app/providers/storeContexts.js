import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)
export const CartContext = createContext(null)
export const OrdersContext = createContext(null)
export const CatalogContext = createContext(null)
export const ProfileContext = createContext(null)
export const UiContext = createContext(null)

function createHook(context, name) {
  return function useDomainHook() {
    const value = useContext(context)
    if (!value) {
      throw new Error(`${name} debe usarse dentro de AppProvider`)
    }
    return value
  }
}

export const useAuth = createHook(AuthContext, 'useAuth')
export const useCart = createHook(CartContext, 'useCart')
export const useOrders = createHook(OrdersContext, 'useOrders')
export const useCatalog = createHook(CatalogContext, 'useCatalog')
export const useProfile = createHook(ProfileContext, 'useProfile')
export const useUi = createHook(UiContext, 'useUi')
