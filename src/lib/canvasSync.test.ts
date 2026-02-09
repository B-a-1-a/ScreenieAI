import { describe, it, expect, vi } from 'vitest'
import { syncScreensToCanvas, focusScreenOnCanvas } from './canvasSync'
import type { AppScreen } from '../types/project'

function makeScreen(overrides: Partial<AppScreen> = {}): AppScreen {
  return {
    id: 'screen-1',
    name: 'Home',
    screenType: 'visual',
    description: 'Main landing screen',
    canvasRegion: { x: 0, y: 0, width: 800, height: 600 },
    chatHistory: [],
    ...overrides,
  }
}

function makeEditor(shapesOnCanvas: any[] = []) {
  return {
    createShape: vi.fn(),
    updateShape: vi.fn(),
    createAssets: vi.fn(),
    getCurrentPageShapes: vi.fn(() => shapesOnCanvas),
    zoomToBounds: vi.fn(),
  }
}

describe('syncScreensToCanvas', () => {
  it('creates frame shapes for screens that do not exist yet', () => {
    const editor = makeEditor([])
    const screens = [makeScreen()]

    syncScreensToCanvas(editor, screens)

    expect(editor.createShape).toHaveBeenCalledWith({
      type: 'frame',
      x: 0,
      y: 0,
      props: {
        w: 800,
        h: 600,
        name: 'Home',
      },
      meta: {
        screenId: 'screen-1',
        kind: 'screenFrame',
      },
    })
  })

  it('updates existing frames when screen data changes', () => {
    const existingFrame = {
      id: 'shape-frame-1',
      type: 'frame',
      x: 0,
      y: 0,
      props: { w: 800, h: 600, name: 'Home' },
      meta: { screenId: 'screen-1', kind: 'screenFrame' },
    }
    const editor = makeEditor([existingFrame])

    const updatedScreen = makeScreen({
      name: 'Home v2',
      canvasRegion: { x: 50, y: 100, width: 1024, height: 768 },
    })

    syncScreensToCanvas(editor, [updatedScreen])

    // Should NOT create a new frame
    expect(editor.createShape).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'frame' }),
    )

    // Should update the existing frame
    expect(editor.updateShape).toHaveBeenCalledWith({
      id: 'shape-frame-1',
      type: 'frame',
      x: 50,
      y: 100,
      props: {
        w: 1024,
        h: 768,
        name: 'Home v2',
      },
    })
  })

  it('creates image shapes when wireframeBase64 is present', () => {
    const editor = makeEditor([])
    const base64Data = 'iVBORw0KGgoAAAANSUhEUg=='
    const screen = makeScreen({ wireframeBase64: base64Data })

    syncScreensToCanvas(editor, [screen])

    // Should create an asset
    const expectedAssetId = `asset:screen-1:${base64Data.length}`
    expect(editor.createAssets).toHaveBeenCalledWith([
      {
        id: expectedAssetId,
        type: 'image',
        typeName: 'asset',
        props: {
          src: `data:image/png;base64,${base64Data}`,
          w: 800,
          h: 600,
          name: 'Home-wireframe',
          mimeType: 'image/png',
          isAnimated: false,
        },
        meta: {
          screenId: 'screen-1',
        },
      },
    ])

    // Should create an image shape (second createShape call, after frame)
    expect(editor.createShape).toHaveBeenCalledWith({
      type: 'image',
      x: 0,
      y: 0,
      props: {
        w: 800,
        h: 600,
        assetId: expectedAssetId,
      },
      meta: {
        screenId: 'screen-1',
        kind: 'screenWireframe',
      },
    })
  })

  it('skips when editor is null', () => {
    // Should not throw
    expect(() => syncScreensToCanvas(null, [makeScreen()])).not.toThrow()
  })
})

describe('focusScreenOnCanvas', () => {
  it('calls zoomToBounds with correct bounds including padding', () => {
    const editor = makeEditor()
    const screen = makeScreen({
      canvasRegion: { x: 100, y: 200, width: 800, height: 600 },
    })

    focusScreenOnCanvas(editor, screen)

    expect(editor.zoomToBounds).toHaveBeenCalledWith({
      x: 100 - 80,
      y: 200 - 80,
      w: 800 + 160,
      h: 600 + 160,
    })
  })

  it('does nothing when editor is null', () => {
    expect(() => focusScreenOnCanvas(null, makeScreen())).not.toThrow()
  })

  it('does nothing when screen is null', () => {
    const editor = makeEditor()

    focusScreenOnCanvas(editor, null)

    expect(editor.zoomToBounds).not.toHaveBeenCalled()
  })
})
