import { useState } from 'react'
import type { Deliverables, AppScreen } from '../types/project'

interface PlanPreviewPanelProps {
  deliverables: Deliverables
  screens: AppScreen[]
}

interface SectionConfig {
  key: string
  label: string
  content: string | undefined
}

function CollapsibleSection({
  label,
  content,
  defaultOpen,
}: {
  label: string
  content: string | undefined
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="plan-preview-section">
      <button
        type="button"
        className="plan-preview-section-header"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="plan-preview-section-title">{label}</span>
        <span className={`plan-preview-chevron ${open ? 'plan-preview-chevron-open' : ''}`}>
          &#9662;
        </span>
      </button>
      <div
        className={`plan-preview-section-body ${open ? 'plan-preview-section-body-open' : ''}`}
      >
        <div className="plan-preview-section-inner">
          {content ? (
            <p className="plan-preview-content">{content}</p>
          ) : (
            <p className="plan-preview-pending">Pending...</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ScreensSection({
  screens,
  defaultOpen,
}: {
  screens: AppScreen[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="plan-preview-section">
      <button
        type="button"
        className="plan-preview-section-header"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="plan-preview-section-title">Screens</span>
        <span className={`plan-preview-chevron ${open ? 'plan-preview-chevron-open' : ''}`}>
          &#9662;
        </span>
      </button>
      <div
        className={`plan-preview-section-body ${open ? 'plan-preview-section-body-open' : ''}`}
      >
        <div className="plan-preview-section-inner">
          {screens.length > 0 ? (
            <ul className="plan-preview-screen-list">
              {screens.map((screen) => (
                <li key={screen.id} className="plan-preview-screen-item">
                  <span className="plan-preview-screen-name">{screen.name}</span>
                  <span
                    className={`plan-preview-screen-badge ${
                      screen.screenType === 'visual'
                        ? 'plan-preview-badge-visual'
                        : 'plan-preview-badge-info'
                    }`}
                  >
                    {screen.screenType}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="plan-preview-pending">Pending...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function PlanPreviewPanel({ deliverables, screens }: PlanPreviewPanelProps) {
  const sections: SectionConfig[] = [
    { key: 'overview', label: 'Overview', content: deliverables.appHighLevel },
    { key: 'features', label: 'Features', content: deliverables.featureList },
    { key: 'appflow', label: 'App Flow', content: deliverables.appFlow },
    { key: 'techstack', label: 'Tech Stack', content: deliverables.suggestedStack },
  ]

  return (
    <aside className="panel plan-preview-panel">
      <div className="plan-preview-header">
        <h3>Plan Preview</h3>
      </div>
      <div className="plan-preview-sections">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.key}
            label={section.label}
            content={section.content}
            defaultOpen={!!section.content}
          />
        ))}
        <ScreensSection screens={screens} defaultOpen={screens.length > 0} />
      </div>
    </aside>
  )
}
