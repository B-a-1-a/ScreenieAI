use std::{collections::HashSet, path::PathBuf, process::Command};

use crate::{
    error::{AppError, AppResult},
    services::paths::{ensure_within_root, screenie_root},
};

fn allowed_ide_commands() -> HashSet<&'static str> {
    HashSet::from(["cursor", "code", "windsurf"])
}

#[tauri::command]
pub fn open_in_ide(path: String, ide: String) -> AppResult<()> {
    let allowed = allowed_ide_commands();
    if !allowed.contains(ide.as_str()) {
        return Err(AppError::Validation(format!(
            "Unsupported IDE '{}'. Allowed values: cursor, code, windsurf",
            ide
        )));
    }

    let docs_root = screenie_root()?;
    let requested_path = PathBuf::from(path);
    let safe_path = ensure_within_root(&docs_root, &requested_path)?;

    Command::new(&ide)
        .arg(&safe_path)
        .spawn()
        .map_err(|err| AppError::Command(format!("Failed to open {}: {}", ide, err)))?;

    Ok(())
}

#[tauri::command]
pub fn detect_ides() -> Vec<String> {
    let allowed = allowed_ide_commands();
    let mut detected = Vec::new();

    for ide in allowed {
        let status = Command::new("which").arg(ide).status();
        if matches!(status, Ok(value) if value.success()) {
            detected.push(ide.to_string());
        }
    }

    detected.sort();
    detected
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_allowlisted_ide() {
        let result = open_in_ide("/tmp".to_string(), "vim".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn allowlist_contains_expected_ides() {
        let allowed = allowed_ide_commands();
        assert!(allowed.contains("cursor"));
        assert!(allowed.contains("code"));
        assert!(allowed.contains("windsurf"));
    }
}
