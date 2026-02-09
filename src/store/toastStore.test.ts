import { beforeEach, describe, expect, it } from 'vitest'
import { useToastStore } from './toastStore'

function resetStore() {
  useToastStore.setState({ toasts: [] })
}

describe('toastStore', () => {
  beforeEach(() => {
    resetStore()
  })

  it('adding a toast increases the count', () => {
    expect(useToastStore.getState().toasts).toHaveLength(0)

    useToastStore.getState().addToast('Hello', 'info')
    expect(useToastStore.getState().toasts).toHaveLength(1)

    useToastStore.getState().addToast('World', 'success')
    expect(useToastStore.getState().toasts).toHaveLength(2)
  })

  it('removing a toast by ID works', () => {
    useToastStore.getState().addToast('First', 'info')
    useToastStore.getState().addToast('Second', 'error')

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(2)

    const firstId = toasts[0]!.id
    useToastStore.getState().removeToast(firstId)

    const remaining = useToastStore.getState().toasts
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.message).toBe('Second')
  })

  it('toast IDs are unique', () => {
    useToastStore.getState().addToast('A', 'info')
    useToastStore.getState().addToast('B', 'success')
    useToastStore.getState().addToast('C', 'error')

    const toasts = useToastStore.getState().toasts
    const ids = toasts.map((t) => t.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  it('stores the correct message and type', () => {
    useToastStore.getState().addToast('Test message', 'error')

    const toast = useToastStore.getState().toasts[0]!
    expect(toast.message).toBe('Test message')
    expect(toast.type).toBe('error')
  })

  it('removing a non-existent ID does not affect existing toasts', () => {
    useToastStore.getState().addToast('Keep me', 'info')
    expect(useToastStore.getState().toasts).toHaveLength(1)

    useToastStore.getState().removeToast('does-not-exist')
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })
})
