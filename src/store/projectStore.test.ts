import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectStore } from './projectStore'

// Mock the Tauri commands module so tests never hit the real backend
vi.mock('../lib/commands', () => ({
  listProjects: vi.fn().mockResolvedValue([]),
  hasGeminiApiKey: vi.fn().mockResolvedValue(false),
  detectIdes: vi.fn().mockResolvedValue([]),
  setGeminiApiKey: vi.fn().mockResolvedValue(undefined),
  clearGeminiApiKey: vi.fn().mockResolvedValue(undefined),
  runInterviewTurn: vi.fn().mockResolvedValue({
    reply: 'What platform?',
    isComplete: false,
    options: ['Web', 'Mobile', 'Desktop', 'Other'],
    updatedDescription: null,
    regenerateWireframe: null,
    changesSummary: null,
  }),
  generateProjectPlan: vi.fn().mockResolvedValue({
    appHighLevel: '# App',
    featureList: '# Features',
    appFlow: '# Flow',
    suggestedStack: '# Stack',
    screens: [{ name: 'Home', screenType: 'visual', description: 'Landing' }],
    cursorRules: '# Rules',
  }),
  generateWireframe: vi.fn().mockResolvedValue({ imageBase64: '', text: '', mimeType: 'image/png' }),
  editWireframe: vi.fn().mockResolvedValue({ imageBase64: '', text: '', mimeType: 'image/png' }),
  saveProject: vi.fn().mockResolvedValue(undefined),
  loadProject: vi.fn().mockResolvedValue(null),
  exportProject: vi.fn().mockResolvedValue({ exportRoot: '', files: [] }),
  openInIde: vi.fn().mockResolvedValue(undefined),
}))

function resetStore() {
  useProjectStore.setState({
    projects: [],
    currentProject: null,
    selectedScreenId: null,
    availableIdes: [],
    hasApiKey: false,
    isBusy: false,
    error: null,
    latestOptions: null,
  })
}

describe('projectStore basic actions', () => {
  beforeEach(() => {
    resetStore()
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

describe('projectStore removeScreen', () => {
  beforeEach(() => {
    resetStore()
  })

  it('removes a screen and reduces the screen count', () => {
    useProjectStore.getState().createProjectDraft('Demo', 'desc')
    useProjectStore.getState().addScreen('Screen A', 'visual')
    useProjectStore.getState().addScreen('Screen B', 'info')
    useProjectStore.getState().addScreen('Screen C', 'visual')

    const screens = useProjectStore.getState().currentProject!.screens
    expect(screens).toHaveLength(3)

    const screenBId = screens[1]!.id
    useProjectStore.getState().removeScreen(screenBId)

    const after = useProjectStore.getState().currentProject!.screens
    expect(after).toHaveLength(2)
    expect(after.find((s) => s.id === screenBId)).toBeUndefined()
  })

  it('updates selectedScreenId when the selected screen is removed', () => {
    useProjectStore.getState().createProjectDraft('Demo', 'desc')
    useProjectStore.getState().addScreen('Screen A', 'visual')
    useProjectStore.getState().addScreen('Screen B', 'info')

    const screens = useProjectStore.getState().currentProject!.screens
    const screenAId = screens[0]!.id
    const screenBId = screens[1]!.id

    // addScreen auto-selects the last added screen
    expect(useProjectStore.getState().selectedScreenId).toBe(screenBId)

    // Remove the currently selected screen (Screen B)
    useProjectStore.getState().removeScreen(screenBId)

    const state = useProjectStore.getState()
    expect(state.currentProject!.screens).toHaveLength(1)
    // Should fall back to the first remaining screen
    expect(state.selectedScreenId).toBe(screenAId)
  })

  it('sets selectedScreenId to null when the last screen is removed', () => {
    useProjectStore.getState().createProjectDraft('Demo', 'desc')
    useProjectStore.getState().addScreen('Only Screen', 'visual')

    const screenId = useProjectStore.getState().currentProject!.screens[0]!.id
    useProjectStore.getState().removeScreen(screenId)

    const state = useProjectStore.getState()
    expect(state.currentProject!.screens).toHaveLength(0)
    expect(state.selectedScreenId).toBeNull()
  })

  it('preserves selectedScreenId when a non-selected screen is removed', () => {
    useProjectStore.getState().createProjectDraft('Demo', 'desc')
    useProjectStore.getState().addScreen('Screen A', 'visual')
    useProjectStore.getState().addScreen('Screen B', 'info')

    const screens = useProjectStore.getState().currentProject!.screens
    const screenAId = screens[0]!.id
    const screenBId = screens[1]!.id

    // Select Screen B (already selected since it was added last)
    expect(useProjectStore.getState().selectedScreenId).toBe(screenBId)

    // Remove Screen A (not the selected one)
    useProjectStore.getState().removeScreen(screenAId)

    const state = useProjectStore.getState()
    expect(state.currentProject!.screens).toHaveLength(1)
    // Selected screen should remain Screen B
    expect(state.selectedScreenId).toBe(screenBId)
  })
})

describe('projectStore interview options', () => {
  beforeEach(() => {
    resetStore()
  })

  it('starts with latestOptions as null', () => {
    expect(useProjectStore.getState().latestOptions).toBeNull()
  })

  it('stores options from interview turn response', async () => {
    useProjectStore.getState().createProjectDraft('Test', 'A test app')
    useProjectStore.setState({ hasApiKey: true })

    await useProjectStore.getState().submitInterviewMessage('I want to build an app')

    const state = useProjectStore.getState()
    expect(state.latestOptions).toEqual(['Web', 'Mobile', 'Desktop', 'Other'])
    expect(state.isBusy).toBe(false)
  })

  it('clears options when user submits a new message', async () => {
    useProjectStore.setState({ latestOptions: ['A', 'B', 'C'] })
    useProjectStore.getState().createProjectDraft('Test', 'A test app')
    useProjectStore.setState({ hasApiKey: true })

    // submitInterviewMessage sets latestOptions to null at start
    const submitPromise = useProjectStore.getState().submitInterviewMessage('Web')

    // While busy, options should be cleared
    expect(useProjectStore.getState().latestOptions).toBeNull()

    await submitPromise
  })

  it('clears options when generating plan', async () => {
    useProjectStore.setState({ latestOptions: ['A', 'B'] })
    useProjectStore.getState().createProjectDraft('Test', 'A test app')
    useProjectStore.setState({ hasApiKey: true })

    const genPromise = useProjectStore.getState().generatePlanFromInterview()
    expect(useProjectStore.getState().latestOptions).toBeNull()
    await genPromise
  })

  it('handles null options from model gracefully', async () => {
    const { runInterviewTurn } = await import('../lib/commands')
    ;(runInterviewTurn as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      reply: 'Tell me more',
      isComplete: false,
      options: null,
      updatedDescription: null,
      regenerateWireframe: null,
      changesSummary: null,
    })

    useProjectStore.getState().createProjectDraft('Test', 'A test app')
    useProjectStore.setState({ hasApiKey: true })

    await useProjectStore.getState().submitInterviewMessage('Hello')

    expect(useProjectStore.getState().latestOptions).toBeNull()
  })

  it('handles missing options field from model gracefully', async () => {
    const { runInterviewTurn } = await import('../lib/commands')
    ;(runInterviewTurn as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      reply: 'Tell me more',
      isComplete: false,
      updatedDescription: null,
      regenerateWireframe: null,
      changesSummary: null,
    })

    useProjectStore.getState().createProjectDraft('Test', 'A test app')
    useProjectStore.setState({ hasApiKey: true })

    await useProjectStore.getState().submitInterviewMessage('Hello')

    expect(useProjectStore.getState().latestOptions).toBeNull()
  })

  it('respects interview round limit', () => {
    useProjectStore.getState().createProjectDraft('Test', 'A test app')
    const project = useProjectStore.getState().currentProject!
    useProjectStore.setState({
      currentProject: {
        ...project,
        interviewHistory: [
          { role: 'user', content: 'a' },
          { role: 'model', content: 'b' },
          { role: 'user', content: 'c' },
          { role: 'model', content: 'd' },
          { role: 'user', content: 'e' },
          { role: 'model', content: 'f' },
        ],
      },
    })

    expect(useProjectStore.getState().getInterviewRoundCount()).toBe(3)
    expect(useProjectStore.getState().isInterviewLimitReached()).toBe(true)
  })
})
