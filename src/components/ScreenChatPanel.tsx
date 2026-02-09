import { FormEvent, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types/project'

interface ScreenChatPanelProps {
  messages: ChatMessage[]
  isBusy: boolean
  onSend: (content: string) => Promise<void>
  onRegenerateWireframe: () => Promise<void>
}

export function ScreenChatPanel({
  messages,
  isBusy,
  onSend,
  onRegenerateWireframe,
}: ScreenChatPanelProps) {
  const [draft, setDraft] = useState('')
  const chatLogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
    }
  }, [messages, isBusy])

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const content = draft.trim()
    if (!content) {
      return
    }
    setDraft('')
    await onSend(content)
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-header split">
        <h3>Chat With This Screen</h3>
        <button disabled={isBusy} onClick={() => void onRegenerateWireframe()} type="button">
          Regenerate Wireframe
        </button>
      </div>
      <div className="chat-log" ref={chatLogRef}>
        {messages.map((message, index) => (
          <article className={`chat-message ${message.role}`} key={`${message.timestamp ?? index}-${index}`}>
            <header>{message.role === 'user' ? 'You' : 'Screenie'}</header>
            <p>{message.content}</p>
          </article>
        ))}
        {isBusy && (
          <article className="chat-message model typing-indicator">
            <header>Screenie</header>
            <p>
              Screenie is thinking<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            </p>
          </article>
        )}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          placeholder="Add a forgot-password link and tighten spacing"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button disabled={isBusy} type="submit">
          Send
        </button>
      </form>
    </section>
  )
}
