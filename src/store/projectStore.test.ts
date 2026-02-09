import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from './projectStore'

describe('projectStore basic actions', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      selectedScreenId: null,
      availableIdes: [],
      hasApiKey: false,
      isBusy: false,
      error: null,
    })
  })

  it('creates a project draft', () => {
    useProjectStore.getState().createProjectDraft('Demo App', 'Sample description')
    const state = useProjectStore.getState()

    expect(state.currentProject?.name).toBe('Demo App')
    expect(state.currentProject?.description).toBe('Sample description')
    expect(state.currentProject?.screens).toHaveLength(0)
  })

  it('adds visual and info screens', () => {
    const store = useProjectStore.getState()
    store.createProjectDraft('Demo App', 'Sample description')

    useProjectStore.getState().addScreen('Home', 'visual')
    useProjectStore.getState().addScreen('Architecture Notes', 'info')

    const state = useProjectStore.getState()
    expect(state.currentProject?.screens).toHaveLength(2)
    expect(state.currentProject?.screens[0]?.screenType).toBe('visual')
    expect(state.currentProject?.screens[1]?.screenType).toBe('info')
    expect(state.selectedScreenId).toBe(state.currentProject?.screens[1]?.id)
  })
})
