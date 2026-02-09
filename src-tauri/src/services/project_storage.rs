use std::{
    fs,
    path::{Path, PathBuf},
};

use base64::prelude::*;
use chrono::Utc;

use crate::{
    error::{AppError, AppResult},
    models::{ExportResult, ProjectState, ProjectSummary},
};

use super::paths::{ensure_within_root, idea_forge_root, slugify};

fn project_root_for_name(docs_root: &Path, name: &str) -> AppResult<PathBuf> {
    let slug = slugify(name);
    if slug.is_empty() {
        return Err(AppError::Validation(
            "Project name must include at least one alphanumeric character".to_string(),
        ));
    }
    Ok(docs_root.join(slug))
}

fn project_json_path(project_root: &Path) -> PathBuf {
    project_root.join(".ideaforge").join("project.json")
}

fn write_text_checked(root: &Path, relative_path: &str, content: &str) -> AppResult<PathBuf> {
    let candidate = root.join(relative_path);
    let safe_target = ensure_within_root(root, &candidate)?;

    if let Some(parent) = safe_target.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(&safe_target, content)?;
    Ok(safe_target)
}

fn build_agents_context(project: &ProjectState) -> String {
    let mut buffer = String::new();
    buffer.push_str("# IdeaForge Project Context\n\n");
    buffer.push_str(&format!("## Project\n{}\n\n", project.name));
    buffer.push_str("## Description\n");
    buffer.push_str(&project.description);
    buffer.push_str("\n\n## Screens\n");

    for screen in &project.screens {
        buffer.push_str(&format!(
            "- {} ({}): {}\n",
            screen.name,
            match screen.screen_type {
                crate::models::ScreenType::Visual => "visual",
                crate::models::ScreenType::Info => "info",
            },
            screen.description
        ));
    }

    buffer
}

fn save_project_state_in_root(docs_root: &Path, project: &ProjectState) -> AppResult<PathBuf> {
    let root = project_root_for_name(docs_root, &project.name)?;
    let ideaforge_dir = root.join(".ideaforge");
    fs::create_dir_all(&ideaforge_dir)?;

    let mut project_to_persist = project.clone();
    project_to_persist.updated_at = Utc::now().to_rfc3339();

    let serialized = serde_json::to_string_pretty(&project_to_persist)?;
    fs::write(project_json_path(&root), serialized)?;

    Ok(root)
}

fn load_project_state_in_root(docs_root: &Path, path: &str) -> AppResult<ProjectState> {
    let input_path = PathBuf::from(path);

    let project_file = if input_path.is_file() {
        input_path
    } else {
        project_json_path(&input_path)
    };

    let safe_project_file = ensure_within_root(docs_root, &project_file)?;
    let raw = fs::read_to_string(safe_project_file)?;
    let project: ProjectState = serde_json::from_str(&raw)?;

    Ok(project)
}

fn list_saved_projects_in_root(root: &Path) -> AppResult<Vec<ProjectSummary>> {
    if !root.exists() {
        return Ok(vec![]);
    }

    let mut projects = Vec::new();

    for entry_result in fs::read_dir(root)? {
        let entry = entry_result?;
        if !entry.file_type()?.is_dir() {
            continue;
        }

        let path = entry.path();
        let project_file = project_json_path(&path);
        if !project_file.exists() {
            continue;
        }

        let raw = match fs::read_to_string(&project_file) {
            Ok(value) => value,
            Err(_) => continue,
        };

        let parsed: ProjectState = match serde_json::from_str(&raw) {
            Ok(value) => value,
            Err(_) => continue,
        };

        projects.push(ProjectSummary {
            name: parsed.name,
            path: path.to_string_lossy().to_string(),
            updated_at: parsed.updated_at,
        });
    }

    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(projects)
}

fn export_project_artifacts_in_root(
    docs_root: &Path,
    project: &ProjectState,
) -> AppResult<ExportResult> {
    let project_root = save_project_state_in_root(docs_root, project)?;
    let mut files = Vec::new();

    if let Some(value) = &project.deliverables.app_flow {
        files.push(
            write_text_checked(&project_root, "appflow.md", value)?
                .to_string_lossy()
                .to_string(),
        );
    }

    if let Some(value) = &project.deliverables.feature_list {
        files.push(
            write_text_checked(&project_root, "featurelist.md", value)?
                .to_string_lossy()
                .to_string(),
        );
    }

    if let Some(value) = &project.deliverables.app_high_level {
        files.push(
            write_text_checked(&project_root, "apphighlevel.md", value)?
                .to_string_lossy()
                .to_string(),
        );
    }

    if let Some(value) = &project.deliverables.suggested_stack {
        files.push(
            write_text_checked(&project_root, "suggestedstack.md", value)?
                .to_string_lossy()
                .to_string(),
        );
    }

    let rules = project
        .deliverables
        .cursor_rules
        .clone()
        .unwrap_or_else(|| build_agents_context(project));

    files.push(
        write_text_checked(&project_root, ".cursorrules", &rules)?
            .to_string_lossy()
            .to_string(),
    );
    files.push(
        write_text_checked(&project_root, ".windsurfrules", &rules)?
            .to_string_lossy()
            .to_string(),
    );
    files.push(
        write_text_checked(&project_root, ".clinerules", &rules)?
            .to_string_lossy()
            .to_string(),
    );

    files.push(
        write_text_checked(
            &project_root,
            "agents/ideaforge-context.md",
            &build_agents_context(project),
        )?
        .to_string_lossy()
        .to_string(),
    );

    for (index, screen) in project.screens.iter().enumerate() {
        let Some(raw_image) = &screen.wireframe_base64 else {
            continue;
        };

        let image_payload = raw_image
            .strip_prefix("data:image/png;base64,")
            .unwrap_or(raw_image);

        let image_bytes = BASE64_STANDARD.decode(image_payload).map_err(|err| {
            AppError::Validation(format!(
                "Invalid base64 wireframe data for screen '{}': {}",
                screen.name, err
            ))
        })?;

        let filename = format!("wireframes/{:02}-{}.png", index + 1, slugify(&screen.name));
        let target = project_root.join(&filename);
        let safe_target = ensure_within_root(&project_root, &target)?;

        if let Some(parent) = safe_target.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&safe_target, image_bytes)?;
        files.push(safe_target.to_string_lossy().to_string());
    }

    Ok(ExportResult {
        export_root: project_root.to_string_lossy().to_string(),
        files,
    })
}

pub fn save_project_state(project: &ProjectState) -> AppResult<PathBuf> {
    let docs_root = idea_forge_root()?;
    save_project_state_in_root(&docs_root, project)
}

pub fn load_project_state(path: &str) -> AppResult<ProjectState> {
    let docs_root = idea_forge_root()?;
    load_project_state_in_root(&docs_root, path)
}

pub fn list_saved_projects() -> AppResult<Vec<ProjectSummary>> {
    let docs_root = idea_forge_root()?;
    list_saved_projects_in_root(&docs_root)
}

pub fn delete_project(path: &str) -> AppResult<()> {
    let docs_root = idea_forge_root()?;
    let project_path = PathBuf::from(path);
    let safe_path = ensure_within_root(&docs_root, &project_path)?;

    if !safe_path.exists() {
        return Err(AppError::Validation(format!(
            "Project directory does not exist: {}",
            safe_path.display()
        )));
    }

    fs::remove_dir_all(&safe_path)?;
    Ok(())
}

pub fn export_project_artifacts(project: &ProjectState) -> AppResult<ExportResult> {
    let docs_root = idea_forge_root()?;
    export_project_artifacts_in_root(&docs_root, project)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{
        AppScreen, CanvasRegion, ChatTurn, Deliverables, ProjectState, ScreenType,
    };
    use tempfile::TempDir;

    fn fixture_project() -> ProjectState {
        ProjectState {
            id: "project-1".to_string(),
            name: "Demo Planner".to_string(),
            description: "Build a planning app".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            screens: vec![AppScreen {
                id: "screen-1".to_string(),
                name: "Home".to_string(),
                screen_type: ScreenType::Visual,
                description: "Landing screen".to_string(),
                wireframe_base64: Some(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PiRyNwAAAABJRU5ErkJggg==".to_string(),
                ),
                wireframe_url: None,
                canvas_region: CanvasRegion {
                    x: 0.0,
                    y: 0.0,
                    width: 400.0,
                    height: 700.0,
                },
                chat_history: vec![ChatTurn {
                    role: crate::models::ChatRole::User,
                    content: "Add a CTA".to_string(),
                    timestamp: None,
                    screen_id: Some("screen-1".to_string()),
                }],
            }],
            deliverables: Deliverables {
                app_high_level: Some("# Overview".to_string()),
                feature_list: Some("# Features".to_string()),
                app_flow: Some("# Flow".to_string()),
                suggested_stack: Some("# Stack".to_string()),
                cursor_rules: Some("# Rules".to_string()),
            },
            interview_history: vec![],
        }
    }

    #[test]
    fn write_text_checked_rejects_traversal() {
        let temp = TempDir::new().expect("temp dir");
        let root = temp.path();
        let result = write_text_checked(root, "../escape.txt", "bad");
        assert!(result.is_err());
    }

    #[test]
    fn write_text_checked_writes_file() {
        let temp = TempDir::new().expect("temp dir");
        let root = temp.path();
        let result = write_text_checked(root, "nested/file.txt", "hello").expect("write file");
        let read = fs::read_to_string(result).expect("read file");
        assert_eq!(read, "hello");
    }

    #[test]
    fn save_load_list_roundtrip() {
        let temp = TempDir::new().expect("temp dir");
        let docs_root = temp.path().join("IdeaForge");
        fs::create_dir_all(&docs_root).expect("create docs root");

        let project = fixture_project();
        let project_root = save_project_state_in_root(&docs_root, &project).expect("save project");

        let loaded = load_project_state_in_root(&docs_root, &project_root.to_string_lossy())
            .expect("load project");
        assert_eq!(loaded.name, project.name);

        let listed = list_saved_projects_in_root(&docs_root).expect("list projects");
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].name, project.name);
    }

    #[test]
    fn export_writes_markdown_and_wireframes() {
        let temp = TempDir::new().expect("temp dir");
        let docs_root = temp.path().join("IdeaForge");
        fs::create_dir_all(&docs_root).expect("create docs root");

        let project = fixture_project();
        let exported =
            export_project_artifacts_in_root(&docs_root, &project).expect("export project");

        assert!(
            exported
                .files
                .iter()
                .any(|path| path.ends_with("featurelist.md"))
        );
        assert!(
            exported
                .files
                .iter()
                .any(|path| path.ends_with("wireframes/01-home.png"))
        );
    }
}
