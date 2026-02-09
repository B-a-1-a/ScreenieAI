import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'

/**
 * Warns the user before leaving the page when there are unsaved changes.
 *
 * Listens for the browser `beforeunload` event and shows a native
 * confirmation dialog if the project store's `isDirty` flag is true.
 */
export function useUnsavedWarning(): void {
  const isDirty = useProjectStore((state) => state.isDirty)

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) {
        return
      }

      event.preventDefault()
      event.returnValue = 'You have unsaved changes. Leave anyway?'
      return 'You have unsaved changes. Leave anyway?'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])
}
