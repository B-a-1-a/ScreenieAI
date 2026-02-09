import type { AppScreen } from '../types/project'

interface ScreensSidebarProps {
  screens: AppScreen[]
  selectedScreenId: string | null
  onSelectScreen: (screenId: string) => void
  onAddVisual: () => void
  onAddInfo: () => void
}

export function ScreensSidebar({
  screens,
  selectedScreenId,
  onSelectScreen,
  onAddVisual,
  onAddInfo,
}: ScreensSidebarProps) {
  return (
    <aside className="panel screens-sidebar">
      <div className="panel-header">
        <h2>Screens</h2>
      </div>
      <div className="screen-list">
        {screens.map((screen) => (
          <button
            key={screen.id}
            className={`screen-item ${screen.id === selectedScreenId ? 'active' : ''}`}
            onClick={() => onSelectScreen(screen.id)}
            type="button"
          >
            <span className="screen-name">{screen.name}</span>
            <span className="screen-kind">{screen.screenType}</span>
          </button>
        ))}
      </div>
      <div className="screen-actions">
        <button type="button" onClick={onAddVisual}>
          + Visual
        </button>
        <button type="button" onClick={onAddInfo}>
          + Info
        </button>
      </div>
    </aside>
  )
}
