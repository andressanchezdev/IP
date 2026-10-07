import { useEffect } from 'react'

const slots = new Map()

export function useWebSocketStateSlot(name, setter, value) {
  useEffect(() => {
    slots.set(name, { setter, value })
    return () => {
      if (slots.get(name)?.setter === setter) slots.delete(name)
    }
  }, [name, setter, value])
}

export function getWebSocketStateSlot(name) {
  return slots.get(name)?.setter
}

export function getWebSocketStateValue(name) {
  return slots.get(name)?.value
}
