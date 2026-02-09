import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'

/**
 * Global keyboard shortcuts for the application.
 *
 * - Cmd/Ctrl + S  => save current project
 * - Cmd/Ctrl + E  => export current project
 * - Cmd/Ctrl + N  => navigate to /new (new project)
 *
 * The hook prevents the default browser behaviour for each combo
 * so the shortcuts work consistently across platforms.
 */
export function useKeyboardShortcuts(navigate: (path: string) => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 's': {
          event.preventDefault()
          void useProjectStore.getState().saveCurrentProject()
          break
        }
        case 'e': {
          event.preventDefault()
          void useProjectStore.getState().exportCurrentProject()
          break
        }
        case 'n': {
          event.preventDefault()
          navigate('/new')
          break
        }
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate])
}
