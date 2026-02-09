import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export function ProjectSelectorPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const hasApiKey = useProjectStore((state) => state.hasApiKey)
  const loadProjectFromPath = useProjectStore((state) => state.loadProjectFromPath)
  const setApiKey = useProjectStore((state) => state.setApiKey)
  const clearApiKey = useProjectStore((state) => state.clearApiKey)
  const isBusy = useProjectStore((state) => state.isBusy)
  const error = useProjectStore((state) => state.error)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState('')

  async function openProject(path: string): Promise<void> {
    if (!hasApiKey) {
      return
    }
    await loadProjectFromPath(path)
    navigate('/workspace')
  }

  async function handleSaveKey(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const value = apiKeyDraft.trim()
    if (!value) {
      return
    }

    await setApiKey(value)
    if (useProjectStore.getState().hasApiKey) {
      setApiKeyDraft('')
      setSettingsOpen(false)
    }
  }

  return (
    <main className="page page-selector">
      <header className="hero">
        <h1>IdeaForge</h1>
        <p>From rough idea to implementation blueprint with screen-level planning.</p>
      </header>

      <section className="panel selector-panel">
        <div className="panel-header split">
          <h2>Recent Projects</h2>
          <div className="selector-actions">
            <button type="button" onClick={() => setSettingsOpen((value) => !value)}>
              Settings
            </button>
            <button
              disabled={!hasApiKey}
              title={!hasApiKey ? 'Set Gemini API key in Settings first' : undefined}
              type="button"
              onClick={() => navigate('/new')}
            >
              + New Project
            </button>
          </div>
        </div>

        {settingsOpen ? (
          <section className="panel settings-panel">
            <div className="panel-header split">
              <h3>Settings</h3>
              <button disabled={isBusy} onClick={() => setSettingsOpen(false)} type="button">
                Close
              </button>
            </div>

            {hasApiKey ? (
              <div className="split">
                <p className="muted">Gemini API key is saved in `~/.ideaforge/settings.json`.</p>
                <button disabled={isBusy} onClick={() => void clearApiKey()} type="button">
                  Clear Key
                </button>
              </div>
            ) : (
              <form className="split" onSubmit={handleSaveKey}>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Paste Gemini API key"
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                />
                <button disabled={isBusy} type="submit">
                  Save Key
                </button>
              </form>
            )}
            <p className="error-text">{error}</p>
          </section>
        ) : null}

        {!hasApiKey ? (
          <p className="error-text">Set Gemini API key in Settings before creating or opening projects.</p>
        ) : null}

        {projects.length === 0 ? (
          <p className="muted">No saved projects found in ~/Documents/IdeaForge.</p>
        ) : (
          <div className="project-list">
            {projects.map((project) => (
              <article className="project-item" key={project.path}>
                <div>
                  <h3>{project.name}</h3>
                  <p className="muted">Updated {new Date(project.updatedAt).toLocaleString()}</p>
                </div>
                <button
                  disabled={!hasApiKey || isBusy}
                  type="button"
                  onClick={() => void openProject(project.path)}
                >
                  Open
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
