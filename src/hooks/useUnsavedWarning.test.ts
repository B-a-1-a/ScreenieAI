import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUnsavedWarning } from './useUnsavedWarning'

let mockIsDirty = false

vi.mock('../store/projectStore', () => ({
  useProjectStore: (selector: (state: { isDirty: boolean }) => boolean) =>
    selector({ isDirty: mockIsDirty }),
}))

describe('useUnsavedWarning', () => {
  beforeEach(() => {
    mockIsDirty = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds a beforeunload event listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')

    const { unmount } = renderHook(() => useUnsavedWarning())

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))

    unmount()
  })

  it('removes the beforeunload event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useUnsavedWarning())
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('does not prevent default when isDirty is false', () => {
    renderHook(() => useUnsavedWarning())

    const event = new Event('beforeunload', { cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('prevents default and sets returnValue when isDirty is true', () => {
    mockIsDirty = true

    const { unmount } = renderHook(() => useUnsavedWarning())

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(event.returnValue).toBe('You have unsaved changes. Leave anyway?')

    unmount()
  })
})
