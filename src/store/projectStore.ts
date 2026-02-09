import { create } from 'zustand'
import {
  clearGeminiApiKey,
  detectIdes,
  editWireframe,
  exportProject,
  generateProjectPlan,
  generateWireframe,
  hasGeminiApiKey,
  listProjects,
  loadProject,
  openInIde,
  runInterviewTurn,
  saveProject,
  setGeminiApiKey,
} from '../lib/commands'
import { normalizePlanOutput } from '../lib/validation'
import type {
  AppScreen,
  CanvasRegion,
  ChatMessage,
  ExportResult,
  ProjectState,
  ProjectSummary,
  ScreenType,
} from '../types/project'

interface ProjectStoreState {
  projects: ProjectSummary[]
  currentProject: ProjectState | null
  selectedScreenId: string | null
  availableIdes: string[]
  hasApiKey: boolean
  isBusy: boolean
  error: string | null
  latestOptions: string[] | null
  initialize: () => Promise<void>
  createProjectDraft: (name: string, description: string) => void
  loadProjectFromPath: (path: string) => Promise<void>
  saveCurrentProject: () => Promise<void>
  setApiKey: (key: string) => Promise<void>
  clearApiKey: () => Promise<void>
  submitInterviewMessage: (content: string) => Promise<void>
  generatePlanFromInterview: () => Promise<void>
  selectScreen: (screenId: string) => void
  addScreen: (name: string, screenType: ScreenType) => void
  updateScreen: (screenId: string, patch: Partial<AppScreen>) => void
  submitScreenMessage: (content: string) => Promise<void>
  regenerateWireframeForSelected: () => Promise<void>
  exportCurrentProject: () => Promise<ExportResult | null>
  openCurrentProjectInIde: (ide: 'cursor' | 'code' | 'windsurf') => Promise<void>
  getInterviewRoundCount: () => number
  isInterviewLimitReached: () => boolean
}

const MAX_INTERVIEW_ROUNDS = 3

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${timestamp}-${randomPart}`
}

function defaultRegion(index: number): CanvasRegion {
  const columns = 4
  const col = index % columns
  const row = Math.floor(index / columns)

  return {
    x: col * 560,
    y: row * 860,
    width: 420,
    height: 760,
  }
}

function mapSeedToScreen(seed: { name: string; screenType: ScreenType; description: string }, index: number): AppScreen {
  return {
    id: createId('screen'),
    name: seed.name,
    screenType: seed.screenType,
    description: seed.description,
    canvasRegion: defaultRegion(index),
    chatHistory: [],
  }
}

function buildInterviewContext(project: ProjectState): string {
  return [
    'INTERVIEW_MODE',
    `Project Name: ${project.name}`,
    `Project Description: ${project.description}`,
    'Goal: ask concise clarifying questions until enough context exists for plan generation.',
  ].join('\n')
}

function buildScreenContext(project: ProjectState, screen: AppScreen): string {
  return [
    'SCREEN_CHAT_MODE',
    `Project Name: ${project.name}`,
    `Project Context: ${project.description}`,
    `Screen Name: ${screen.name}`,
    `Screen Type: ${screen.screenType}`,
    `Current Description: ${screen.description}`,
    'Return updatedDescription and regenerateWireframe=true only when visual layout should change.',
  ].join('\n')
}

function upsertScreen(project: ProjectState, updatedScreen: AppScreen): ProjectState {
  return {
    ...project,
    updatedAt: nowIso(),
    screens: project.screens.map((screen) => (screen.id === updatedScreen.id ? updatedScreen : screen)),
  }
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  try {
    const serialized = JSON.stringify(error)
    if (serialized && serialized !== '{}' && serialized !== 'null') {
      return serialized
    }
  } catch (_ignored) {
    // Ignore serialization failures and return fallback below.
  }

  return fallback
}

function isMissingApiKeyError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('gemini api key has not been set') || normalized.includes('gemini api key exists but is empty')
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  currentProject: null,
  selectedScreenId: null,
  availableIdes: [],
  hasApiKey: false,
  isBusy: false,
  error: null,
  latestOptions: null,

  initialize: async () => {
    set({ isBusy: true, error: null })
    try {
      const [projectList, apiKeyState, ides] = await Promise.all([
        listProjects(),
        hasGeminiApiKey(),
        detectIdes(),
      ])

      set({
        projects: projectList,
        hasApiKey: apiKeyState,
        availableIdes: ides,
        isBusy: false,
      })
    } catch (error) {
      set({
        isBusy: false,
        error: toErrorMessage(error, 'Failed to initialize app state'),
      })
    }
  },

  createProjectDraft: (name, description) => {
    const now = nowIso()
    const draft: ProjectState = {
      id: createId('project'),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      screens: [],
      deliverables: {},
      interviewHistory: [],
    }

    set({
      currentProject: draft,
      selectedScreenId: null,
      error: null,
    })
  },

  loadProjectFromPath: async (path) => {
    set({ isBusy: true, error: null })
    try {
      const project = await loadProject(path)
      set({
        currentProject: project,
        selectedScreenId: project.screens[0]?.id ?? null,
        isBusy: false,
      })
    } catch (error) {
      set({
        isBusy: false,
        error: toErrorMessage(error, 'Failed to load project'),
      })
    }
  },

  saveCurrentProject: async () => {
    const project = get().currentProject
    if (!project) {
      return
    }

    set({ isBusy: true, error: null })
    try {
      await saveProject(project)
      const projectList = await listProjects()
      set({
        projects: projectList,
        isBusy: false,
      })
    } catch (error) {
      set({
        isBusy: false,
        error: toErrorMessage(error, 'Failed to save project'),
      })
    }
  },

  setApiKey: async (key) => {
    set({ isBusy: true, error: null })
    try {
      await setGeminiApiKey(key)
      const hasKey = await hasGeminiApiKey()
      if (!hasKey) {
        throw new Error('Gemini API key could not be verified after saving. Please save it again.')
      }

      set({ hasApiKey: true, isBusy: false })
    } catch (error) {
      const message = toErrorMessage(error, 'Failed to store API key')
      set({
        isBusy: false,
        hasApiKey: false,
        error: message,
      })
    }
  },

  clearApiKey: async () => {
    set({ isBusy: true, error: null })
    try {
      await clearGeminiApiKey()
      set({ hasApiKey: false, isBusy: false })
    } catch (error) {
      set({
        isBusy: false,
        error: toErrorMessage(error, 'Failed to clear API key'),
      })
    }
  },

  submitInterviewMessage: async (content) => {
    const state = get()
    const project = state.currentProject
    if (!project) {
      return
    }

    // Check if interview limit reached
    const modelMessageCount = project.interviewHistory.filter((msg) => msg.role === 'model').length
    if (modelMessageCount >= MAX_INTERVIEW_ROUNDS) {
      set({
        error: `Interview limited to ${MAX_INTERVIEW_ROUNDS} question rounds. Please generate your plan.`,
      })
      return
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: nowIso(),
    }

    const nextHistory = [...project.interviewHistory, userMessage]

    set({
      isBusy: true,
      error: null,
      latestOptions: null,
      currentProject: {
        ...project,
        updatedAt: nowIso(),
        interviewHistory: nextHistory,
      },
    })

    try {
      const turn = await runInterviewTurn(buildInterviewContext(project), nextHistory)
      const modelMessage: ChatMessage = {
        role: 'model',
        content: turn.reply,
        timestamp: nowIso(),
      }

      const current = get().currentProject
      if (!current) {
        set({ isBusy: false })
        return
      }

      set({
        isBusy: false,
        latestOptions: turn.options ?? null,
        currentProject: {
          ...current,
          updatedAt: nowIso(),
          interviewHistory: [...current.interviewHistory, modelMessage],
        },
      })
    } catch (error) {
      const message = toErrorMessage(error, 'Interview step failed')
      set({
        isBusy: false,
        hasApiKey: isMissingApiKeyError(message) ? false : get().hasApiKey,
        error: message,
      })
    }
  },

  generatePlanFromInterview: async () => {
    const project = get().currentProject
    if (!project) {
      return
    }

    set({ isBusy: true, error: null, latestOptions: null })

    try {
      const planResponse = await generateProjectPlan({
        projectName: project.name,
        projectDescription: project.description,
        interviewHistory: project.interviewHistory,
      })

      const plan = normalizePlanOutput(planResponse)
      const screens = plan.screens.map((screen, index) => mapSeedToScreen(screen, index))

      const nextProject: ProjectState = {
        ...project,
        updatedAt: nowIso(),
        screens,
        deliverables: {
          appHighLevel: plan.appHighLevel,
          featureList: plan.featureList,
          appFlow: plan.appFlow,
          suggestedStack: plan.suggestedStack,
          cursorRules: plan.cursorRules,
        },
      }

      await saveProject(nextProject)
      const projectList = await listProjects()

      set({
        currentProject: nextProject,
        selectedScreenId: screens[0]?.id ?? null,
        projects: projectList,
        isBusy: false,
      })
    } catch (error) {
      const message = toErrorMessage(error, 'Plan generation failed')
      set({
        isBusy: false,
        hasApiKey: isMissingApiKeyError(message) ? false : get().hasApiKey,
        error: message,
      })
    }
  },

  selectScreen: (screenId) => set({ selectedScreenId: screenId }),

  addScreen: (name, screenType) => {
    const project = get().currentProject
    if (!project) {
      return
    }

    const newScreen: AppScreen = {
      id: createId('screen'),
      name,
      screenType,
      description: `${name} screen details`,
      canvasRegion: defaultRegion(project.screens.length),
      chatHistory: [],
    }

    const nextProject: ProjectState = {
      ...project,
      updatedAt: nowIso(),
      screens: [...project.screens, newScreen],
    }

    set({
      currentProject: nextProject,
      selectedScreenId: newScreen.id,
    })
  },

  updateScreen: (screenId, patch) => {
    const project = get().currentProject
    if (!project) {
      return
    }

    const updatedScreens = project.screens.map((screen) => {
      if (screen.id !== screenId) {
        return screen
      }
      return {
        ...screen,
        ...patch,
      }
    })

    set({
      currentProject: {
        ...project,
        updatedAt: nowIso(),
        screens: updatedScreens,
      },
    })
  },

  submitScreenMessage: async (content) => {
    const state = get()
    const project = state.currentProject
    const selectedScreenId = state.selectedScreenId

    if (!project || !selectedScreenId) {
      return
    }

    const screen = project.screens.find((value) => value.id === selectedScreenId)
    if (!screen) {
      return
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: nowIso(),
      screenId: selectedScreenId,
    }

    const nextScreen: AppScreen = {
      ...screen,
      chatHistory: [...screen.chatHistory, userMessage],
    }

    set({
      isBusy: true,
      error: null,
      currentProject: upsertScreen(project, nextScreen),
    })

    try {
      const turn = await runInterviewTurn(
        buildScreenContext(project, nextScreen),
        nextScreen.chatHistory,
      )

      const modelMessage: ChatMessage = {
        role: 'model',
        content: turn.reply,
        timestamp: nowIso(),
        screenId: selectedScreenId,
      }

      const current = get().currentProject
      if (!current) {
        set({ isBusy: false })
        return
      }

      const currentScreen = current.screens.find((value) => value.id === selectedScreenId)
      if (!currentScreen) {
        set({ isBusy: false })
        return
      }

      let updatedScreen: AppScreen = {
        ...currentScreen,
        description: turn.updatedDescription?.trim().length
          ? turn.updatedDescription
          : currentScreen.description,
        chatHistory: [...currentScreen.chatHistory, modelMessage],
      }

      if (turn.regenerateWireframe) {
        const wireframe = await editWireframe({
          existingImageBase64: updatedScreen.wireframeBase64 ?? '',
          editInstruction: content,
          screenName: updatedScreen.name,
        }).catch(async () =>
          generateWireframe({
            screenName: updatedScreen.name,
            description: updatedScreen.description,
            appContext: current.description,
          }),
        )

        updatedScreen = {
          ...updatedScreen,
          wireframeBase64: wireframe.imageBase64,
        }
      }

      set({
        isBusy: false,
        currentProject: upsertScreen(current, updatedScreen),
      })
    } catch (error) {
      const message = toErrorMessage(error, 'Screen chat failed')
      set({
        isBusy: false,
        hasApiKey: isMissingApiKeyError(message) ? false : get().hasApiKey,
        error: message,
      })
    }
  },

  regenerateWireframeForSelected: async () => {
    const state = get()
    const project = state.currentProject
    const selectedScreenId = state.selectedScreenId

    if (!project || !selectedScreenId) {
      return
    }

    const screen = project.screens.find((value) => value.id === selectedScreenId)
    if (!screen) {
      return
    }

    set({ isBusy: true, error: null })

    try {
      const wireframe = await generateWireframe({
        screenName: screen.name,
        description: screen.description,
        appContext: project.description,
      })

      const current = get().currentProject
      if (!current) {
        set({ isBusy: false })
        return
      }

      const currentScreen = current.screens.find((value) => value.id === selectedScreenId)
      if (!currentScreen) {
        set({ isBusy: false })
        return
      }

      const updated = {
        ...currentScreen,
        wireframeBase64: wireframe.imageBase64,
      }

      set({
        isBusy: false,
        currentProject: upsertScreen(current, updated),
      })
    } catch (error) {
      const message = toErrorMessage(error, 'Wireframe generation failed')
      set({
        isBusy: false,
        hasApiKey: isMissingApiKeyError(message) ? false : get().hasApiKey,
        error: message,
      })
    }
  },

  exportCurrentProject: async () => {
    const project = get().currentProject
    if (!project) {
      return null
    }

    set({ isBusy: true, error: null })

    try {
      const result = await exportProject(project)
      set({ isBusy: false })
      return result
    } catch (error) {
      set({
        isBusy: false,
        error: toErrorMessage(error, 'Project export failed'),
      })
      return null
    }
  },

  openCurrentProjectInIde: async (ide) => {
    const project = get().currentProject
    if (!project) {
      return
    }

    set({ isBusy: true, error: null })
    try {
      const projects = await listProjects()
      const match = projects.find((item) => item.name === project.name)
      if (!match) {
        throw new Error('Project must be saved before opening in an IDE')
      }

      await openInIde(match.path, ide)
      set({ isBusy: false })
    } catch (error) {
      set({
        isBusy: false,
        error: toErrorMessage(error, 'Failed to open IDE'),
      })
    }
  },

  getInterviewRoundCount: () => {
    const project = get().currentProject
    if (!project) {
      return 0
    }
    return project.interviewHistory.filter((msg) => msg.role === 'model').length
  },

  isInterviewLimitReached: () => {
    const project = get().currentProject
    if (!project) {
      return false
    }
    const modelMessageCount = project.interviewHistory.filter((msg) => msg.role === 'model').length
    return modelMessageCount >= MAX_INTERVIEW_ROUNDS
  },
}))
