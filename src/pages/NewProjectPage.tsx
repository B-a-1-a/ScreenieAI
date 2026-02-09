import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export function NewProjectPage() {
  const navigate = useNavigate()
  const createProjectDraft = useProjectStore((state) => state.createProjectDraft)
  const hasApiKey = useProjectStore((state) => state.hasApiKey)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!hasApiKey) {
      navigate('/')
    }
  }, [hasApiKey, navigate])

  if (!hasApiKey) {
    return <main className="page">Redirecting to home...</main>
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    if (!trimmedName || !trimmedDescription) {
      return
    }

    createProjectDraft(trimmedName, trimmedDescription)
    navigate('/interview')
  }

  return (
    <main className="page page-new-project">
      <section className="panel new-project-panel">
        <div className="panel-header">
          <h2>Create New Project</h2>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="project-name">
            Project Name
          </label>
          <input
            id="project-name"
            placeholder="HabitForge"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label className="field-label" htmlFor="project-description">
            High-Level Description
          </label>
          <textarea
            id="project-description"
            placeholder="A habit tracking app with shared streak groups and weekly progress loops."
            rows={7}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <div className="split">
            <button type="button" onClick={() => navigate('/')}>
              Back
            </button>
            <button type="submit">Start Interview</button>
          </div>
        </form>
      </section>
    </main>
  )
}
