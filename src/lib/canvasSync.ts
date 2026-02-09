import type { AppScreen } from '../types/project'

type AnyEditor = {
  createShape?: (shape: unknown) => void
  updateShape?: (shape: unknown) => void
  createAssets?: (assets: unknown[]) => void
  getCurrentPageShapes?: () => Array<any>
  zoomToBounds?: (bounds: { x: number; y: number; w: number; h: number }) => void
}

function findShape(editor: AnyEditor, predicate: (shape: any) => boolean): any | null {
  const shapes = editor.getCurrentPageShapes?.() ?? []
  return shapes.find(predicate) ?? null
}

export function syncScreensToCanvas(editor: AnyEditor | null, screens: AppScreen[]): void {
  if (!editor?.createShape || !editor.getCurrentPageShapes) {
    return
  }

  for (const screen of screens) {
    const frame = findShape(
      editor,
      (shape) => shape.type === 'frame' && shape.meta?.screenId === screen.id,
    )

    if (!frame) {
      editor.createShape({
        type: 'frame',
        x: screen.canvasRegion.x,
        y: screen.canvasRegion.y,
        props: {
          w: screen.canvasRegion.width,
          h: screen.canvasRegion.height,
          name: screen.name,
        },
        meta: {
          screenId: screen.id,
          kind: 'screenFrame',
        },
      })
    } else {
      editor.updateShape?.({
        id: frame.id,
        type: 'frame',
        x: screen.canvasRegion.x,
        y: screen.canvasRegion.y,
        props: {
          ...frame.props,
          w: screen.canvasRegion.width,
          h: screen.canvasRegion.height,
          name: screen.name,
        },
      })
    }

    if (!screen.wireframeBase64 || !editor.createAssets) {
      continue
    }

    const imageShape = findShape(
      editor,
      (shape) => shape.type === 'image' && shape.meta?.screenId === screen.id,
    )

    const assetId = `asset:${screen.id}:${screen.wireframeBase64.length}`
    editor.createAssets([
      {
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          src: `data:image/png;base64,${screen.wireframeBase64}`,
          w: screen.canvasRegion.width,
          h: screen.canvasRegion.height,
          name: `${screen.name}-wireframe`,
          mimeType: 'image/png',
          isAnimated: false,
        },
        meta: {
          screenId: screen.id,
        },
      },
    ])

    if (!imageShape) {
      editor.createShape({
        type: 'image',
        x: screen.canvasRegion.x,
        y: screen.canvasRegion.y,
        props: {
          w: screen.canvasRegion.width,
          h: screen.canvasRegion.height,
          assetId,
        },
        meta: {
          screenId: screen.id,
          kind: 'screenWireframe',
        },
      })
    } else {
      editor.updateShape?.({
        id: imageShape.id,
        type: 'image',
        x: screen.canvasRegion.x,
        y: screen.canvasRegion.y,
        props: {
          ...imageShape.props,
          w: screen.canvasRegion.width,
          h: screen.canvasRegion.height,
          assetId,
        },
      })
    }
  }
}

export function focusScreenOnCanvas(editor: AnyEditor | null, screen: AppScreen | null): void {
  if (!editor?.zoomToBounds || !screen) {
    return
  }

  editor.zoomToBounds({
    x: screen.canvasRegion.x - 80,
    y: screen.canvasRegion.y - 80,
    w: screen.canvasRegion.width + 160,
    h: screen.canvasRegion.height + 160,
  })
}
