import type { AppScreen, Deliverables, ScreenType } from '../types/project'
import { MarkdownView } from './MarkdownView'

interface InfoPanelProps {
  screen: AppScreen | null
  deliverables: Deliverables
  onUpdateScreen: (screenId: string, patch: Partial<AppScreen>) => void
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

export function InfoPanel({ screen, deliverables, onUpdateScreen }: InfoPanelProps) {
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

      {screen.wireframeBase64 ? (
        <img
          alt={`${screen.name} wireframe`}
          className="wireframe-preview"
          src={`data:image/png;base64,${screen.wireframeBase64}`}
        />
      ) : null}

      <div className="deliverable-preview">
        <h4>Plan Snapshot</h4>
        <MarkdownView content={deliverableSummary(deliverables)} />
      </div>
    </section>
  )
}
