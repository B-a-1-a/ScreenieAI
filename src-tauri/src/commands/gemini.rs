use crate::{
    error::AppResult,
    models::{
        ChatTurn, InterviewTurn, PlanInput, PlanOutput, WireframeEditInput, WireframeInput,
        WireframeOutput,
    },
    services::{gemini::GeminiService, key_store},
};

const INTERVIEW_PROMPT: &str = include_str!("../../../prompts/interview-system-prompt.md");

#[tauri::command]
pub fn set_gemini_api_key(key: String) -> AppResult<()> {
    key_store::set_gemini_api_key(&key)
}

#[tauri::command]
pub fn has_gemini_api_key() -> AppResult<bool> {
    key_store::has_gemini_api_key()
}

#[tauri::command]
pub fn clear_gemini_api_key() -> AppResult<()> {
    key_store::clear_gemini_api_key()
}

#[tauri::command]
pub async fn run_interview_turn(
    project_context: String,
    history: Vec<ChatTurn>,
) -> AppResult<InterviewTurn> {
    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini
        .run_interview_turn(&api_key, &project_context, &history, INTERVIEW_PROMPT)
        .await
}

#[tauri::command]
pub async fn generate_project_plan(input: PlanInput) -> AppResult<PlanOutput> {
    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini.generate_project_plan(&api_key, &input).await
}

#[tauri::command]
pub async fn generate_wireframe(input: WireframeInput) -> AppResult<WireframeOutput> {
    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini.generate_wireframe(&api_key, &input).await
}

#[tauri::command]
pub async fn edit_wireframe(input: WireframeEditInput) -> AppResult<WireframeOutput> {
    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini.edit_wireframe(&api_key, &input).await
}
