use crate::{
    error::AppResult,
    models::{ExportInput, ExportResult, ProjectState, ProjectSummary, SaveProjectInput},
    services::project_storage,
};

#[tauri::command]
pub fn save_project(input: SaveProjectInput) -> AppResult<()> {
    project_storage::save_project_state(&input.project)?;
    Ok(())
}

#[tauri::command]
pub fn load_project(path: String) -> AppResult<ProjectState> {
    project_storage::load_project_state(&path)
}

#[tauri::command]
pub fn list_projects() -> AppResult<Vec<ProjectSummary>> {
    project_storage::list_saved_projects()
}

#[tauri::command]
pub fn export_project(input: ExportInput) -> AppResult<ExportResult> {
    project_storage::export_project_artifacts(&input.project)
}
