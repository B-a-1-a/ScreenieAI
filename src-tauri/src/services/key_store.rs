use std::{fs, path::{Path, PathBuf}};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

const SETTINGS_DIR_NAME: &str = ".ideaforge";
const SETTINGS_FILE_NAME: &str = "settings.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SettingsFile {
    gemini_api_key: Option<String>,
}

fn settings_file_path() -> AppResult<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| {
        AppError::Validation("Could not determine home directory for settings".to_string())
    })?;
    Ok(home.join(SETTINGS_DIR_NAME).join(SETTINGS_FILE_NAME))
}

fn read_settings(path: &Path) -> AppResult<SettingsFile> {
    if !path.exists() {
        return Ok(SettingsFile::default());
    }

    let raw = fs::read_to_string(path)?;
    if raw.trim().is_empty() {
        return Ok(SettingsFile::default());
    }

    serde_json::from_str(&raw).map_err(AppError::from)
}

fn write_settings(path: &Path, settings: &SettingsFile) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let serialized = serde_json::to_string_pretty(settings)?;
    fs::write(path, serialized)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let permissions = fs::Permissions::from_mode(0o600);
        fs::set_permissions(path, permissions)?;
    }

    Ok(())
}

fn set_api_key_with_path(path: &Path, value: &str) -> AppResult<()> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation(
            "Gemini API key cannot be empty".to_string(),
        ));
    }

    let mut settings = read_settings(path)?;
    settings.gemini_api_key = Some(trimmed.to_string());
    write_settings(path, &settings)
}

fn read_api_key_with_path(path: &Path) -> AppResult<String> {
    // First try to read from environment variable
    if let Ok(env_key) = std::env::var("GEMINI_API_KEY") {
        if !env_key.trim().is_empty() {
            return Ok(env_key.trim().to_string());
        }
    }

    // Fall back to file-based storage
    let settings = read_settings(path)?;
    let value = settings
        .gemini_api_key
        .ok_or_else(|| AppError::Validation("Gemini API key has not been set".to_string()))?;

    if value.trim().is_empty() {
        Err(AppError::Validation(
            "Gemini API key exists but is empty".to_string(),
        ))
    } else {
        Ok(value.trim().to_string())
    }
}

fn has_api_key_with_path(path: &Path) -> AppResult<bool> {
    // Check environment variable first
    if let Ok(env_key) = std::env::var("GEMINI_API_KEY") {
        if !env_key.trim().is_empty() {
            return Ok(true);
        }
    }

    // Fall back to file-based storage
    match read_api_key_with_path(path) {
        Ok(_) => Ok(true),
        Err(AppError::Validation(_)) => Ok(false),
        Err(err) => Err(err),
    }
}

fn clear_api_key_with_path(path: &Path) -> AppResult<()> {
    let mut settings = read_settings(path)?;
    settings.gemini_api_key = None;
    write_settings(path, &settings)
}

pub fn set_gemini_api_key(value: &str) -> AppResult<()> {
    let path = settings_file_path()?;
    set_api_key_with_path(&path, value)
}

pub fn has_gemini_api_key() -> AppResult<bool> {
    let path = settings_file_path()?;
    has_api_key_with_path(&path)
}

pub fn clear_gemini_api_key() -> AppResult<()> {
    let path = settings_file_path()?;
    clear_api_key_with_path(&path)
}

pub fn read_gemini_api_key() -> AppResult<String> {
    let path = settings_file_path()?;
    read_api_key_with_path(&path)
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use super::*;

    fn temp_settings_path() -> (TempDir, PathBuf) {
        let temp = TempDir::new().expect("temp dir");
        let path = temp.path().join(SETTINGS_DIR_NAME).join(SETTINGS_FILE_NAME);
        (temp, path)
    }

    #[test]
    fn file_store_roundtrip() {
        let (_temp, path) = temp_settings_path();

        set_api_key_with_path(&path, "abc").expect("set should succeed");
        assert!(has_api_key_with_path(&path).expect("has should succeed"));
        assert_eq!(
            read_api_key_with_path(&path).expect("read should succeed"),
            "abc"
        );

        clear_api_key_with_path(&path).expect("clear should succeed");
        assert!(!has_api_key_with_path(&path).expect("has should succeed"));
    }

    #[test]
    fn rejects_empty_key() {
        let (_temp, path) = temp_settings_path();
        let result = set_api_key_with_path(&path, "   ");
        assert!(result.is_err());
    }

    #[test]
    fn has_key_is_false_for_empty_stored_value() {
        let (_temp, path) = temp_settings_path();
        let malformed = SettingsFile {
            gemini_api_key: Some("".to_string()),
        };
        write_settings(&path, &malformed).expect("write malformed value");

        let has_key = has_api_key_with_path(&path).expect("has should succeed");
        assert!(!has_key);
    }
}
