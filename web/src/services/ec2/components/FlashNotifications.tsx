import { useState, useCallback } from 'react'
import Flashbar from '@cloudscape-design/components/flashbar'
import type { FlashbarProps } from '@cloudscape-design/components/flashbar'

type FlashItem = FlashbarProps.MessageDefinition

function generateId(): string {
  return `flash-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

type UseFlashNotificationsResult = {
  items: FlashItem[]
  addSuccess: (message: string) => void
  addError: (message: string) => void
  clearAll: () => void
}

export function useFlashNotifications(): UseFlashNotificationsResult {
  const [items, setItems] = useState<FlashItem[]>([])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const addSuccess = useCallback(
    (message: string) => {
      const id = generateId()
      const newItem: FlashItem = {
        id,
        type: 'success',
        content: message,
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => removeItem(id),
      }
      setItems((prev) => {
        const trimmed = prev.length >= 3 ? prev.slice(1) : prev
        return [...trimmed, newItem]
      })
      setTimeout(() => removeItem(id), 5000)
    },
    [removeItem],
  )

  const addError = useCallback(
    (message: string) => {
      const id = generateId()
      const newItem: FlashItem = {
        id,
        type: 'error',
        content: message,
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => removeItem(id),
      }
      setItems((prev) => {
        const trimmed = prev.length >= 3 ? prev.slice(1) : prev
        return [...trimmed, newItem]
      })
    },
    [removeItem],
  )

  const clearAll = useCallback(() => {
    setItems([])
  }, [])

  return { items, addSuccess, addError, clearAll }
}

type FlashNotificationsProps = {
  items: FlashItem[]
}

export function FlashNotifications({ items }: FlashNotificationsProps) {
  return <Flashbar items={items} />
}
