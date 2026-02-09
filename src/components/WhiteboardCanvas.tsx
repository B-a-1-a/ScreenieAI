import { useEffect, useMemo, useRef } from 'react'
import { Tldraw } from 'tldraw'
import { focusScreenOnCanvas, syncScreensToCanvas } from '../lib/canvasSync'
import type { AppScreen } from '../types/project'

interface WhiteboardCanvasProps {
  projectId: string
  screens: AppScreen[]
  selectedScreenId: string | null
  generatingWireframeForScreenId: string | null
}

export function WhiteboardCanvas({
  projectId,
  screens,
  selectedScreenId,
  generatingWireframeForScreenId,
}: WhiteboardCanvasProps) {
  const editorRef = useRef<any>(null)

  const selectedScreen = useMemo(
    () => screens.find((screen) => screen.id === selectedScreenId) ?? null,
    [screens, selectedScreenId],
  )

  const generatingScreen = useMemo(
    () => screens.find((screen) => screen.id === generatingWireframeForScreenId) ?? null,
    [screens, generatingWireframeForScreenId],
  )

  useEffect(() => {
    syncScreensToCanvas(editorRef.current, screens)
  }, [screens])

  useEffect(() => {
    focusScreenOnCanvas(editorRef.current, selectedScreen)
  }, [selectedScreen])

  return (
    <section className="panel canvas-panel">
      <div className="panel-header">
        <h3>Whiteboard</h3>
      </div>
      <div className="canvas-host" style={{ position: 'relative' }}>
        <Tldraw
          persistenceKey={`project-${projectId}`}
          onMount={(editor) => {
            editorRef.current = editor
            syncScreensToCanvas(editorRef.current, screens)
            focusScreenOnCanvas(editorRef.current, selectedScreen)
          }}
        />
        {generatingScreen && (
          <div className="canvas-generating-overlay">
            <span className="canvas-generating-badge">
              Generating wireframe for {generatingScreen.name}
              <span className="loading-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
