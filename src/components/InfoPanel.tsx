import { useState } from 'react'
import type { AppScreen, Deliverables, ScreenType } from '../types/project'
import { MarkdownView } from './MarkdownView'
import { copyToClipboard } from '../lib/clipboard'

function CopyInlineButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? 'copy-btn-success' : ''}`}
      onClick={handleCopy}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

interface InfoPanelProps {
  screen: AppScreen | null
  deliverables: Deliverables
  onUpdateScreen: (screenId: string, patch: Partial<AppScreen>) => void
  isGeneratingWireframe: boolean
}

function deliverableSummary(deliverables: Deliverables): string {
  if (deliverables.appHighLevel) {
    return deliverables.appHighLevel.slice(0, 220)
  }
  if (deliverables.featureList) {
    return deliverables.featureList.slice(0, 220)
  }
  return 'No plan deliverables generated yet.'
}

export function InfoPanel({ screen, deliverables, onUpdateScreen, isGeneratingWireframe }: InfoPanelProps) {
  if (!screen) {
    return (
      <section className="panel info-panel">
        <div className="panel-header">
          <h3>Info About This Screen</h3>
        </div>
        <p className="muted">Select a screen to edit metadata and description.</p>
      </section>
    )
  }

  return (
    <section className="panel info-panel">
      <div className="panel-header">
        <h3>Info About This Screen</h3>
      </div>

      <label className="field-label" htmlFor="screen-name">
        Name
      </label>
      <input
        id="screen-name"
        value={screen.name}
        onChange={(event) => onUpdateScreen(screen.id, { name: event.target.value })}
      />

      <label className="field-label" htmlFor="screen-type">
        Type
      </label>
      <select
        id="screen-type"
        value={screen.screenType}
        onChange={(event) =>
          onUpdateScreen(screen.id, { screenType: event.target.value as ScreenType })
        }
      >
        <option value="visual">Visual</option>
        <option value="info">Info</option>
      </select>

      <label className="field-label" htmlFor="screen-description">
        Description
      </label>
      <textarea
        id="screen-description"
        value={screen.description}
        onChange={(event) => onUpdateScreen(screen.id, { description: event.target.value })}
        rows={8}
      />
      <CopyInlineButton text={screen.description} label="Copy Description" />

      {isGeneratingWireframe ? (
        <div className="wireframe-placeholder">
          <div className="wireframe-generating-text">
            Generating wireframe
            <span className="loading-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        </div>
      ) : screen.wireframeBase64 ? (
        <img
          alt={`${screen.name} wireframe`}
          className="wireframe-preview"
          src={`data:image/png;base64,${screen.wireframeBase64}`}
        />
      ) : null}

      <div className="deliverable-preview">
        <h4>Plan Snapshot</h4>
        <MarkdownView content={deliverableSummary(deliverables)} />
        <CopyInlineButton text={deliverableSummary(deliverables)} label="Copy Plan Snapshot" />
      </div>
    </section>
  )
}
