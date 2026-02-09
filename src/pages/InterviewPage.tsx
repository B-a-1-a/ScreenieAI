import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export function InterviewPage() {
  const navigate = useNavigate()

  const project = useProjectStore((state) => state.currentProject)
  const isBusy = useProjectStore((state) => state.isBusy)
  const error = useProjectStore((state) => state.error)
  const hasApiKey = useProjectStore((state) => state.hasApiKey)
  const submitInterviewMessage = useProjectStore((state) => state.submitInterviewMessage)
  const generatePlanFromInterview = useProjectStore((state) => state.generatePlanFromInterview)
  const getInterviewRoundCount = useProjectStore((state) => state.getInterviewRoundCount)
  const isInterviewLimitReached = useProjectStore((state) => state.isInterviewLimitReached)

  const [message, setMessage] = useState('')

  const roundCount = getInterviewRoundCount()
  const limitReached = isInterviewLimitReached()

  useEffect(() => {
    if (!project) {
      navigate('/new')
    }
  }, [navigate, project])

  useEffect(() => {
    if (!hasApiKey) {
      navigate('/')
    }
  }, [hasApiKey, navigate])

  if (!project || !hasApiKey) {
    return <main className="page">Loading project...</main>
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
        <div className="panel-header">
          <div>
            <h2>Interview Phase</h2>
            <p className="muted" style={{ fontSize: '1rem', marginTop: '0.3rem' }}>
              {project.name}
            </p>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
              Round {roundCount} of 3 • Gemini key is configured from Home Settings.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/new')}>
            Edit Idea
          </button>
        </div>

        <div className="chat-log interview-log">
          {project.interviewHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--ink-muted)',
              fontSize: '0.95rem',
              lineHeight: '1.6'
            }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
                💬 Start the conversation
              </p>
              <p>
                Describe your target users, platform, and core value proposition.
              </p>
            </div>
          ) : (
            project.interviewHistory.map((item, index) => (
              <article className={`chat-message ${item.role}`} key={`${item.timestamp ?? index}-${index}`}>
                <header>{item.role === 'user' ? 'You' : 'IdeaForge'}</header>
                <p>{item.content}</p>
              </article>
            ))
          )}
        </div>

        {limitReached ? (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fff8ed 0%, #fff5e6 100%)',
            border: '1px solid var(--brand)',
            textAlign: 'center',
            color: 'var(--ink)',
          }}>
            <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>
              ✓ Interview Complete
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
              You've completed 3 question rounds. Ready to generate your plan!
            </p>
          </div>
        ) : (
          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              disabled={isBusy}
              placeholder="Answer the current question…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button disabled={isBusy} type="submit">
              Send
            </button>
          </form>
        )}

        <div className="split">
          <p className="error-text">{error}</p>
          <button
            disabled={isBusy}
            type="button"
            onClick={() => void handleGeneratePlan()}
            style={limitReached ? {
              background: 'var(--brand)',
              color: 'var(--brand-ink)',
              borderColor: '#d95526',
              fontWeight: 600,
            } : {}}
          >
            Generate Plan
          </button>
        </div>
      </section>
    </main>
  )
}
