import { useRef, useState } from 'react'
import type { AppScreen } from '../types/project'

interface ScreensSidebarProps {
  screens: AppScreen[]
  selectedScreenId: string | null
  onSelectScreen: (screenId: string) => void
  onRenameScreen: (screenId: string, newName: string) => void
  onAddVisual: () => void
  onAddInfo: () => void
}

export function ScreensSidebar({
  screens,
  selectedScreenId,
  onSelectScreen,
  onRenameScreen,
  onAddVisual,
  onAddInfo,
}: ScreensSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing(screen: AppScreen): void {
    setEditingId(screen.id)
    setEditValue(screen.name)
    // Focus the input on next render
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitRename(screenId: string): void {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== screens.find((s) => s.id === screenId)?.name) {
      onRenameScreen(screenId, trimmed)
    }
    setEditingId(null)
  }

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
            onDoubleClick={() => startEditing(screen)}
            type="button"
          >
            {editingId === screen.id ? (
              <input
                ref={inputRef}
                className="screen-name-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitRename(screen.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitRename(screen.id)
                  } else if (e.key === 'Escape') {
                    setEditingId(null)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="screen-name">{screen.name}</span>
            )}
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
