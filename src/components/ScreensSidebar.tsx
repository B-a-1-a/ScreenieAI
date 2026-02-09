import { useRef, useState } from 'react'
import type { AppScreen } from '../types/project'

interface ScreensSidebarProps {
  screens: AppScreen[]
  selectedScreenId: string | null
  onSelectScreen: (screenId: string) => void
  onRenameScreen: (screenId: string, newName: string) => void
  onRemoveScreen: (screenId: string) => void
  onReorderScreens: (fromIndex: number, toIndex: number) => void
  onAddVisual: () => void
  onAddInfo: () => void
}

export function ScreensSidebar({
  screens,
  selectedScreenId,
  onSelectScreen,
  onRenameScreen,
  onRemoveScreen,
  onReorderScreens,
  onAddVisual,
  onAddInfo,
}: ScreensSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing(screen: AppScreen): void {
    setEditingId(screen.id)
    setEditValue(screen.name)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitRename(screenId: string): void {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== screens.find((s) => s.id === screenId)?.name) {
      onRenameScreen(screenId, trimmed)
    }
    setEditingId(null)
  }

  function handleDragStart(e: React.DragEvent<HTMLButtonElement>, index: number): void {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  function handleDragOver(e: React.DragEvent<HTMLButtonElement>, index: number): void {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  function handleDragLeave(): void {
    setDragOverIndex(null)
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>, toIndex: number): void {
    e.preventDefault()
    const fromIndex = Number(e.dataTransfer.getData('text/plain'))
    setDragOverIndex(null)
    if (!Number.isNaN(fromIndex) && fromIndex !== toIndex) {
      onReorderScreens(fromIndex, toIndex)
    }
  }

  function handleDragEnd(): void {
    setDragOverIndex(null)
  }

  return (
    <aside className="panel screens-sidebar">
      <div className="panel-header">
        <h2>Screens</h2>
      </div>
      <div className="screen-list">
        {screens.map((screen, index) => (
          <button
            key={screen.id}
            className={`screen-item${screen.id === selectedScreenId ? ' active' : ''}${dragOverIndex === index ? ' drag-over' : ''}`}
            onClick={() => onSelectScreen(screen.id)}
            onDoubleClick={() => startEditing(screen)}
            draggable={editingId !== screen.id}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            type="button"
          >
            <span className="screen-drag-handle" aria-hidden="true">&#x2807;</span>
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
            <span
              role="button"
              tabIndex={0}
              className="screen-delete-btn"
              title="Delete screen"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`Delete "${screen.name}"?`)) {
                  onRemoveScreen(screen.id)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  if (window.confirm(`Delete "${screen.name}"?`)) {
                    onRemoveScreen(screen.id)
                  }
                }
              }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              &times;
            </span>
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
