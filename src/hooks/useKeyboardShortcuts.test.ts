import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

const saveCurrentProject = vi.fn().mockResolvedValue(undefined)
const exportCurrentProject = vi.fn().mockResolvedValue(null)

// Mock the project store so we never hit the real backend
vi.mock('../store/projectStore', () => ({
  useProjectStore: {
    getState: () => ({
      saveCurrentProject,
      exportCurrentProject,
    }),
  },
}))

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  })
  const spy = vi.spyOn(event, 'preventDefault')
  window.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  const navigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts without throwing', () => {
    expect(() => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(navigate))
      unmount()
    }).not.toThrow()
  })

  it('calls saveCurrentProject on Ctrl+S', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(navigate))

    const event = fireKey('s', { ctrlKey: true })

    expect(event.defaultPrevented || vi.mocked(event.preventDefault).mock.calls.length > 0).toBe(true)
    expect(saveCurrentProject).toHaveBeenCalled()

    unmount()
  })

  it('calls exportCurrentProject on Ctrl+E', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(navigate))

    const event = fireKey('e', { ctrlKey: true })

    expect(event.defaultPrevented || vi.mocked(event.preventDefault).mock.calls.length > 0).toBe(true)
    expect(exportCurrentProject).toHaveBeenCalled()

    unmount()
  })

  it('navigates to /new on Ctrl+N', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(navigate))

    const event = fireKey('n', { ctrlKey: true })

    expect(event.defaultPrevented || vi.mocked(event.preventDefault).mock.calls.length > 0).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/new')

    unmount()
  })

  it('does nothing when modifier key is not pressed', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(navigate))

    fireKey('s', { ctrlKey: false, metaKey: false })

    expect(saveCurrentProject).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()

    unmount()
  })

  it('works with metaKey (Cmd on macOS)', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(navigate))

    fireKey('s', { metaKey: true })

    expect(saveCurrentProject).toHaveBeenCalled()

    unmount()
  })

  it('cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useKeyboardShortcuts(navigate))
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
