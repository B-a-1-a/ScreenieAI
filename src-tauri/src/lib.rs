mod commands;
mod error;
mod models;
mod services;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file if it exists (ignoring errors)
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            set_gemini_api_key,
            has_gemini_api_key,
            clear_gemini_api_key,
            run_interview_turn,
            generate_project_plan,
            generate_wireframe,
            edit_wireframe,
            save_project,
            load_project,
            list_projects,
            export_project,
            open_in_ide,
            detect_ides,
        ])
        .run(tauri::generate_context!())
        .expect("error while running IdeaForge");
}
