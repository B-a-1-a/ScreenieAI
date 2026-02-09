export type ChatRole = 'user' | 'model'
export type ScreenType = 'visual' | 'info'

export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp?: string
  screenId?: string
}

export interface InterviewTurn {
  reply: string
  isComplete: boolean
  options?: string[] | null
  updatedDescription?: string | null
  regenerateWireframe?: boolean | null
  changesSummary?: string | null
}

export interface CanvasRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface AppScreen {
  id: string
  name: string
  screenType: ScreenType
  description: string
  wireframeBase64?: string
  wireframeUrl?: string
  canvasRegion: CanvasRegion
  chatHistory: ChatMessage[]
}

export interface Deliverables {
  appHighLevel?: string
  featureList?: string
  appFlow?: string
  suggestedStack?: string
  cursorRules?: string
}

export interface ProjectState {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  screens: AppScreen[]
  deliverables: Deliverables
  interviewHistory: ChatMessage[]
}

export interface ProjectSummary {
  name: string
  path: string
  updatedAt: string
}

export interface PlanInput {
  projectName: string
  projectDescription: string
  interviewHistory: ChatMessage[]
}

export interface ScreenSeed {
  name: string
  screenType: ScreenType
  description: string
}

export interface PlanOutput {
  appHighLevel: string
  featureList: string
  appFlow: string
  suggestedStack: string
  screens: ScreenSeed[]
  cursorRules: string
}

export interface WireframeInput {
  screenName: string
  description: string
  appContext: string
}

export interface WireframeEditInput {
  existingImageBase64: string
  editInstruction: string
  screenName: string
}

export interface WireframeOutput {
  imageBase64: string
  text: string
  mimeType: string
}

export interface ExportResult {
  exportRoot: string
  files: string[]
}
