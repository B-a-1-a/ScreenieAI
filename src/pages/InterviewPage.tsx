import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { PlanPreviewPanel } from '../components/PlanPreviewPanel'

export function InterviewPage() {
  const navigate = useNavigate()

  const project = useProjectStore((state) => state.currentProject)
  const isBusy = useProjectStore((state) => state.isBusy)
  const error = useProjectStore((state) => state.error)
  const hasApiKey = useProjectStore((state) => state.hasApiKey)
  const latestOptions = useProjectStore((state) => state.latestOptions)
  const submitInterviewMessage = useProjectStore((state) => state.submitInterviewMessage)
  const generatePlanFromInterview = useProjectStore((state) => state.generatePlanFromInterview)
  const getInterviewRoundCount = useProjectStore((state) => state.getInterviewRoundCount)
  const isInterviewLimitReached = useProjectStore((state) => state.isInterviewLimitReached)

  const [message, setMessage] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)
  const chatLogRef = useRef<HTMLDivElement>(null)

  const roundCount = getInterviewRoundCount()
  const limitReached = isInterviewLimitReached()
  const hasOptions = latestOptions != null && latestOptions.length > 0

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

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
    }
  }, [project?.interviewHistory, isBusy])

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
    setShowOtherInput(false)
    await submitInterviewMessage(content)
  }

  async function handleOptionClick(option: string): Promise<void> {
    if (option.toLowerCase() === 'other') {
      setShowOtherInput(true)
      return
    }
    setShowOtherInput(false)
    await submitInterviewMessage(option)
  }

  async function handleGeneratePlan(): Promise<void> {
    await generatePlanFromInterview()
    const nextProject = useProjectStore.getState().currentProject
    if (nextProject?.screens.length) {
      navigate('/workspace')
    }
  }

  const deliverables = project.deliverables
  const screens = project.screens

  return (
    <main className="page page-interview interview-split">
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

        <div className="chat-log interview-log" ref={chatLogRef}>
          {project.interviewHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--ink-muted)',
              fontSize: '0.95rem',
              lineHeight: '1.6'
            }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
                Start the conversation
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
          {isBusy && (
            <article className="chat-message model typing-indicator">
              <header>IdeaForge</header>
              <p>
                IdeaForge is thinking<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
              </p>
            </article>
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
              Interview Complete
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
              You've completed 3 question rounds. Ready to generate your plan!
            </p>
          </div>
        ) : (
          <>
            {hasOptions && !showOtherInput && (
              <div className="interview-options">
                {latestOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isBusy}
                    className={`interview-option-btn${option.toLowerCase() === 'other' ? ' interview-option-other' : ''}`}
                    onClick={() => void handleOptionClick(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {(!hasOptions || showOtherInput) && (
              <form className="chat-input" onSubmit={handleSendMessage}>
                <input
                  disabled={isBusy}
                  placeholder={showOtherInput ? 'Type your own answer…' : 'Answer the current question…'}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <button disabled={isBusy} type="submit">
                  Send
                </button>
                {showOtherInput && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setShowOtherInput(false)}
                    style={{ gridColumn: '1 / -1' }}
                  >
                    Back to options
                  </button>
                )}
              </form>
            )}
          </>
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

      <PlanPreviewPanel deliverables={deliverables} screens={screens} />
    </main>
  )
}
