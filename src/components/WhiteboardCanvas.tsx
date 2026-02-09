import { useEffect, useMemo, useRef } from 'react'
import { Tldraw } from 'tldraw'
import { focusScreenOnCanvas, syncScreensToCanvas } from '../lib/canvasSync'
import type { AppScreen } from '../types/project'

interface WhiteboardCanvasProps {
  projectId: string
  screens: AppScreen[]
  selectedScreenId: string | null
}

export function WhiteboardCanvas({
  projectId,
  screens,
  selectedScreenId,
}: WhiteboardCanvasProps) {
  const editorRef = useRef<any>(null)

  const selectedScreen = useMemo(
    () => screens.find((screen) => screen.id === selectedScreenId) ?? null,
    [screens, selectedScreenId],
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
      <div className="canvas-host">
        <Tldraw
          persistenceKey={`project-${projectId}`}
          onMount={(editor) => {
            editorRef.current = editor
            syncScreensToCanvas(editorRef.current, screens)
            focusScreenOnCanvas(editorRef.current, selectedScreen)
          }}
        />
      </div>
    </section>
  )
}
