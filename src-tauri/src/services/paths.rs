use std::path::{Component, Path, PathBuf};

use crate::error::{AppError, AppResult};

pub fn idea_forge_root() -> AppResult<PathBuf> {
    let docs = dirs::document_dir().ok_or_else(|| {
        AppError::Validation("Could not determine a Documents directory on this system".to_string())
    })?;
    Ok(docs.join("IdeaForge"))
}

pub fn slugify(input: &str) -> String {
    let mut out = String::new();
    let mut previous_dash = false;

    for ch in input.trim().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            previous_dash = false;
        } else if !previous_dash {
            out.push('-');
            previous_dash = true;
        }
    }

    out.trim_matches('-').to_string()
}

pub fn normalize_path(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();

    for component in path.components() {
        match component {
            Component::ParentDir => {
                normalized.pop();
            }
            Component::CurDir => {}
            Component::Normal(value) => normalized.push(value),
            Component::Prefix(prefix) => normalized.push(prefix.as_os_str()),
            Component::RootDir => normalized.push(Path::new("/")),
        }
    }

    normalized
}

pub fn ensure_within_root(root: &Path, candidate: &Path) -> AppResult<PathBuf> {
    let normalized_root = normalize_path(root);
    let normalized_candidate = normalize_path(candidate);

    if normalized_candidate.starts_with(&normalized_root) {
        Ok(normalized_candidate)
    } else {
        Err(AppError::Validation(format!(
            "Path escapes project root. root={}, candidate={}",
            normalized_root.display(),
            normalized_candidate.display()
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugify_collapses_separators() {
        assert_eq!(slugify(" Habit Tracker ++ App "), "habit-tracker-app");
    }

    #[test]
    fn ensure_within_root_rejects_escape() {
        let root = PathBuf::from("/tmp/IdeaForge/root");
        let escaped = PathBuf::from("/tmp/IdeaForge/root/../secrets");
        let result = ensure_within_root(&root, &escaped);
        assert!(result.is_err());
    }

    #[test]
    fn ensure_within_root_accepts_valid_path() {
        let root = PathBuf::from("/tmp/IdeaForge/root");
        let valid = PathBuf::from("/tmp/IdeaForge/root/data/project.json");
        let result = ensure_within_root(&root, &valid);
        assert!(result.is_ok());
    }
}
