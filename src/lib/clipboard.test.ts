import { describe, expect, it, vi, beforeEach } from 'vitest'
import { copyToClipboard } from './clipboard'

describe('copyToClipboard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    })
  })

  it('returns true on successful copy', async () => {
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)

    const result = await copyToClipboard('hello world')

    expect(result).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world')
  })

  it('returns false when clipboard write fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
      new Error('Clipboard access denied'),
    )

    const result = await copyToClipboard('hello world')

    expect(result).toBe(false)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world')
  })
})
