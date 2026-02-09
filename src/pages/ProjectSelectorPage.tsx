import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export function ProjectSelectorPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const hasApiKey = useProjectStore((state) => state.hasApiKey)
  const loadProjectFromPath = useProjectStore((state) => state.loadProjectFromPath)
  const deleteProjectByPath = useProjectStore((state) => state.deleteProjectByPath)
  const duplicateProjectByPath = useProjectStore((state) => state.duplicateProjectByPath)
  const setApiKey = useProjectStore((state) => state.setApiKey)
  const clearApiKey = useProjectStore((state) => state.clearApiKey)
  const isBusy = useProjectStore((state) => state.isBusy)
  const error = useProjectStore((state) => state.error)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return projects
    }
    return projects.filter((project) => project.name.toLowerCase().includes(query))
  }, [projects, searchQuery])

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

  async function handleDelete(path: string, name: string): Promise<void> {
    const confirmed = window.confirm(`Delete project "${name}"? This cannot be undone.`)
    if (!confirmed) {
      return
    }
    await deleteProjectByPath(path)
  }

  async function handleDuplicate(path: string, name: string): Promise<void> {
    const newName = window.prompt(`Duplicate "${name}" as:`, `${name} (Copy)`)
    if (!newName || !newName.trim()) {
      return
    }
    await duplicateProjectByPath(path, newName.trim())
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

        {projects.length > 0 ? (
          <input
            className="search-input"
            type="text"
            placeholder="Search projects by name..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        ) : null}

        {projects.length === 0 ? (
          <p className="muted">No saved projects found in ~/Documents/IdeaForge.</p>
        ) : filteredProjects.length === 0 ? (
          <p className="muted">No projects match your search.</p>
        ) : (
          <div className="project-list">
            {filteredProjects.map((project) => (
              <article className="project-item" key={project.path}>
                <div>
                  <h3>{project.name}</h3>
                  <p className="muted">Updated {new Date(project.updatedAt).toLocaleString()}</p>
                </div>
                <div className="project-actions">
                  <button
                    disabled={!hasApiKey || isBusy}
                    type="button"
                    onClick={() => void openProject(project.path)}
                  >
                    Open
                  </button>
                  <button
                    disabled={isBusy}
                    type="button"
                    onClick={() => void handleDuplicate(project.path, project.name)}
                  >
                    Duplicate
                  </button>
                  <button
                    disabled={isBusy}
                    type="button"
                    style={{
                      color: 'var(--danger)',
                      borderColor: 'var(--danger)',
                    }}
                    onClick={() => void handleDelete(project.path, project.name)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
