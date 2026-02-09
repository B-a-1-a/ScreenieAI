import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExportDialog } from '../components/ExportDialog'
import { InfoPanel } from '../components/InfoPanel'
import { ScreenChatPanel } from '../components/ScreenChatPanel'
import { ScreensSidebar } from '../components/ScreensSidebar'
import { WhiteboardCanvas } from '../components/WhiteboardCanvas'
import { useProjectStore } from '../store/projectStore'
import type { ExportResult } from '../types/project'

export function WorkspacePage() {
  const navigate = useNavigate()

  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)

  const project = useProjectStore((state) => state.currentProject)
  const hasApiKey = useProjectStore((state) => state.hasApiKey)
  const selectedScreenId = useProjectStore((state) => state.selectedScreenId)
  const isBusy = useProjectStore((state) => state.isBusy)
  const isDirty = useProjectStore((state) => state.isDirty)
  const error = useProjectStore((state) => state.error)
  const availableIdes = useProjectStore((state) => state.availableIdes)
  const generatingWireframeForScreenId = useProjectStore(
    (state) => state.generatingWireframeForScreenId,
  )

  const selectScreen = useProjectStore((state) => state.selectScreen)
  const removeScreen = useProjectStore((state) => state.removeScreen)
  const reorderScreens = useProjectStore((state) => state.reorderScreens)
  const addScreen = useProjectStore((state) => state.addScreen)
  const updateScreen = useProjectStore((state) => state.updateScreen)
  const submitScreenMessage = useProjectStore((state) => state.submitScreenMessage)
  const regenerateWireframeForSelected = useProjectStore(
    (state) => state.regenerateWireframeForSelected,
  )
  const saveCurrentProject = useProjectStore((state) => state.saveCurrentProject)
  const exportCurrentProject = useProjectStore((state) => state.exportCurrentProject)
  const openCurrentProjectInIde = useProjectStore((state) => state.openCurrentProjectInIde)

  useEffect(() => {
    if (!project) {
      navigate('/')
    }
  }, [navigate, project])

  useEffect(() => {
    if (!hasApiKey) {
      navigate('/')
    }
  }, [hasApiKey, navigate])

  if (!project || !hasApiKey) {
    return <main className="page">Loading workspace...</main>
  }

  const selectedScreen = project.screens.find((screen) => screen.id === selectedScreenId) ?? null

  async function handleExport(): Promise<void> {
    const result = await exportCurrentProject()
    if (result) {
      setExportResult(result)
      setShowExportDialog(true)
    }
  }

  function handleNavigateToProjects(): void {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Leave anyway?')
      if (!confirmed) {
        return
      }
    }
    navigate('/')
  }

  return (
    <main className="workspace-root">
      <header className="workspace-header">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.description}</p>
        </div>
        <div className="workspace-actions">
          <button disabled={isBusy} type="button" onClick={() => void saveCurrentProject()}>
            Save
          </button>
          <button disabled={isBusy} type="button" onClick={() => void handleExport()}>
            Export
          </button>
          {availableIdes.map((ide) => (
            <button
              key={ide}
              disabled={isBusy}
              onClick={() => void openCurrentProjectInIde(ide as 'cursor' | 'code' | 'windsurf')}
              type="button"
            >
              Open in {ide}
            </button>
          ))}
          <button type="button" onClick={handleNavigateToProjects}>
            Projects
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <ScreensSidebar
          screens={project.screens}
          selectedScreenId={selectedScreenId}
          onSelectScreen={selectScreen}
          onRenameScreen={(screenId, newName) => updateScreen(screenId, { name: newName })}
          onRemoveScreen={removeScreen}
          onReorderScreens={reorderScreens}
          onAddVisual={() => addScreen(`Screen ${project.screens.length + 1}`, 'visual')}
          onAddInfo={() => addScreen(`Doc ${project.screens.length + 1}`, 'info')}
        />

        <WhiteboardCanvas
          projectId={project.id}
          screens={project.screens}
          selectedScreenId={selectedScreenId}
          generatingWireframeForScreenId={generatingWireframeForScreenId}
        />

        <section className="workspace-right">
          <InfoPanel
            screen={selectedScreen}
            deliverables={project.deliverables}
            onUpdateScreen={updateScreen}
            isGeneratingWireframe={generatingWireframeForScreenId === selectedScreenId}
          />
          <ScreenChatPanel
            messages={selectedScreen?.chatHistory ?? []}
            isBusy={isBusy}
            onSend={submitScreenMessage}
            onRegenerateWireframe={regenerateWireframeForSelected}
          />
        </section>
      </section>

      <footer className="workspace-footer">
        <p className="error-text">{error}</p>
      </footer>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        exportResult={exportResult}
        availableIdes={availableIdes}
        onOpenInIde={(ide) => void openCurrentProjectInIde(ide as 'cursor' | 'code' | 'windsurf')}
        isBusy={isBusy}
      />
    </main>
  )
}
