import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export function InterviewPage() {
  const navigate = useNavigate()

  const project = useProjectStore((state) => state.currentProject)
  const isBusy = useProjectStore((state) => state.isBusy)
  const error = useProjectStore((state) => state.error)
  const hasApiKey = useProjectStore((state) => state.hasApiKey)
  const setApiKey = useProjectStore((state) => state.setApiKey)
  const clearApiKey = useProjectStore((state) => state.clearApiKey)
  const submitInterviewMessage = useProjectStore((state) => state.submitInterviewMessage)
  const generatePlanFromInterview = useProjectStore((state) => state.generatePlanFromInterview)

  const [apiKey, setApiKeyDraft] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!project) {
      navigate('/new')
    }
  }, [navigate, project])

  if (!project) {
    return <main className="page">Loading project...</main>
  }

  async function handleSetApiKey(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const key = apiKey.trim()
    if (!key) {
      return
    }
    await setApiKey(key)
    setApiKeyDraft('')
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const content = message.trim()
    if (!content) {
      return
    }
    setMessage('')
    await submitInterviewMessage(content)
  }

  async function handleGeneratePlan(): Promise<void> {
    await generatePlanFromInterview()
    const nextProject = useProjectStore.getState().currentProject
    if (nextProject?.screens.length) {
      navigate('/workspace')
    }
  }

  return (
    <main className="page page-interview">
      <section className="panel interview-panel">
        <div className="panel-header split">
          <div>
            <h2>Interview Phase</h2>
            <p className="muted">{project.name}</p>
          </div>
          <button type="button" onClick={() => navigate('/new')}>
            Edit Idea
          </button>
        </div>

        <div className="api-key-block">
          <h3>Gemini API Key</h3>
          {hasApiKey ? (
            <div className="split">
              <p className="muted">Key is stored in the OS keychain.</p>
              <button disabled={isBusy} onClick={() => void clearApiKey()} type="button">
                Clear Key
              </button>
            </div>
          ) : (
            <form className="split" onSubmit={handleSetApiKey}>
              <input
                placeholder="AIza..."
                value={apiKey}
                onChange={(event) => setApiKeyDraft(event.target.value)}
              />
              <button disabled={isBusy} type="submit">
                Save Key
              </button>
            </form>
          )}
        </div>

        <div className="chat-log interview-log">
          {project.interviewHistory.length === 0 ? (
            <p className="muted">Start by describing your target users, platform, and core value proposition.</p>
          ) : (
            project.interviewHistory.map((item, index) => (
              <article className={`chat-message ${item.role}`} key={`${item.timestamp ?? index}-${index}`}>
                <header>{item.role === 'user' ? 'You' : 'IdeaForge'}</header>
                <p>{item.content}</p>
              </article>
            ))
          )}
        </div>

        <form className="chat-input" onSubmit={handleSendMessage}>
          <input
            disabled={!hasApiKey || isBusy}
            placeholder={hasApiKey ? 'Answer the current question…' : 'Set API key to start interviewing'}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button disabled={!hasApiKey || isBusy} type="submit">
            Send
          </button>
        </form>

        <div className="split">
          <p className="error-text">{error}</p>
          <button disabled={!hasApiKey || isBusy} type="button" onClick={() => void handleGeneratePlan()}>
            Generate Plan
          </button>
        </div>
      </section>
    </main>
  )
}
