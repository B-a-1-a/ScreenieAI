use crate::{
    error::AppResult,
    models::{
        ChatTurn, InterviewTurn, PlanInput, PlanOutput, WireframeEditInput, WireframeInput,
        WireframeOutput,
    },
    services::{gemini::GeminiService, key_store, openrouter::OpenRouterService},
};

const INTERVIEW_PROMPT: &str = include_str!("../../../prompts/interview-system-prompt.md");

/// Read OpenRouter API key from environment. Returns None if not set.
fn read_openrouter_key() -> Option<String> {
    std::env::var("OPENROUTER")
        .ok()
        .filter(|k| !k.trim().is_empty())
}

#[tauri::command]
pub fn set_gemini_api_key(key: String) -> AppResult<()> {
    key_store::set_gemini_api_key(&key)
}

#[tauri::command]
pub fn has_gemini_api_key() -> AppResult<bool> {
    // Also return true if OpenRouter key is available
    if read_openrouter_key().is_some() {
        return Ok(true);
    }
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
    // Try OpenRouter first (free models)
    if let Some(or_key) = read_openrouter_key() {
        let or_service = OpenRouterService::new()?;
        match or_service
            .run_interview_turn(&or_key, &project_context, &history, INTERVIEW_PROMPT)
            .await
        {
            Ok(result) => return Ok(result),
            Err(_) => {} // Fall through to Gemini
        }
    }

    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini
        .run_interview_turn(&api_key, &project_context, &history, INTERVIEW_PROMPT)
        .await
}

#[tauri::command]
pub async fn generate_project_plan(input: PlanInput) -> AppResult<PlanOutput> {
    // Try OpenRouter first (free models)
    if let Some(or_key) = read_openrouter_key() {
        let or_service = OpenRouterService::new()?;
        match or_service.generate_project_plan(&or_key, &input).await {
            Ok(result) => return Ok(result),
            Err(_) => {} // Fall through to Gemini
        }
    }

    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini.generate_project_plan(&api_key, &input).await
}

#[tauri::command]
pub async fn generate_wireframe(input: WireframeInput) -> AppResult<WireframeOutput> {
    // Try OpenRouter first (free image model)
    if let Some(or_key) = read_openrouter_key() {
        let or_service = OpenRouterService::new()?;
        match or_service.generate_wireframe(&or_key, &input).await {
            Ok(result) => return Ok(result),
            Err(_) => {} // Fall through to Gemini
        }
    }

    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini.generate_wireframe(&api_key, &input).await
}

#[tauri::command]
pub async fn edit_wireframe(input: WireframeEditInput) -> AppResult<WireframeOutput> {
    // Try OpenRouter first (free image model)
    if let Some(or_key) = read_openrouter_key() {
        let or_service = OpenRouterService::new()?;
        match or_service.edit_wireframe(&or_key, &input).await {
            Ok(result) => return Ok(result),
            Err(_) => {} // Fall through to Gemini
        }
    }

    let api_key = key_store::read_gemini_api_key()?;
    let gemini = GeminiService::new()?;
    gemini.edit_wireframe(&api_key, &input).await
}
