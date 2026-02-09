import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export function ProjectSelectorPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const loadProjectFromPath = useProjectStore((state) => state.loadProjectFromPath)
  const isBusy = useProjectStore((state) => state.isBusy)

  async function openProject(path: string): Promise<void> {
    await loadProjectFromPath(path)
    navigate('/workspace')
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
          <button type="button" onClick={() => navigate('/new')}>
            + New Project
          </button>
        </div>

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
                <button disabled={isBusy} type="button" onClick={() => void openProject(project.path)}>
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
