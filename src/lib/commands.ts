import { invoke } from '@tauri-apps/api/core'
import type {
  ExportResult,
  InterviewTurn,
  PlanInput,
  PlanOutput,
  ProjectState,
  ProjectSummary,
  WireframeEditInput,
  WireframeInput,
  WireframeOutput,
  ChatMessage,
} from '../types/project'

async function tauriInvoke<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, payload)
}

export async function setGeminiApiKey(key: string): Promise<void> {
  await tauriInvoke('set_gemini_api_key', { key })
}

export async function hasGeminiApiKey(): Promise<boolean> {
  return tauriInvoke<boolean>('has_gemini_api_key')
}

export async function clearGeminiApiKey(): Promise<void> {
  await tauriInvoke('clear_gemini_api_key')
}

export async function runInterviewTurn(projectContext: string, history: ChatMessage[]): Promise<InterviewTurn> {
  return tauriInvoke<InterviewTurn>('run_interview_turn', {
    projectContext,
    history,
  })
}

export async function generateProjectPlan(input: PlanInput): Promise<PlanOutput> {
  return tauriInvoke<PlanOutput>('generate_project_plan', { input })
}

export async function generateWireframe(input: WireframeInput): Promise<WireframeOutput> {
  return tauriInvoke<WireframeOutput>('generate_wireframe', { input })
}

export async function editWireframe(input: WireframeEditInput): Promise<WireframeOutput> {
  return tauriInvoke<WireframeOutput>('edit_wireframe', { input })
}

export async function saveProject(project: ProjectState): Promise<void> {
  await tauriInvoke('save_project', {
    input: { project },
  })
}

export async function loadProject(path: string): Promise<ProjectState> {
  return tauriInvoke<ProjectState>('load_project', { path })
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return tauriInvoke<ProjectSummary[]>('list_projects')
}

export async function exportProject(project: ProjectState): Promise<ExportResult> {
  return tauriInvoke<ExportResult>('export_project', {
    input: { project },
  })
}

export async function openInIde(path: string, ide: 'cursor' | 'code' | 'windsurf'): Promise<void> {
  await tauriInvoke('open_in_ide', { path, ide })
}

export async function detectIdes(): Promise<string[]> {
  return tauriInvoke<string[]>('detect_ides')
}
