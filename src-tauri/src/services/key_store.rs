use crate::error::{AppError, AppResult};

const SERVICE_NAME: &str = "com.ideaforge.desktop";
const ACCOUNT_NAME: &str = "gemini-api-key";

pub trait SecretStore {
    fn set(&self, key: &str, value: &str) -> AppResult<()>;
    fn get(&self, key: &str) -> AppResult<Option<String>>;
    fn delete(&self, key: &str) -> AppResult<()>;
}

#[derive(Debug, Default)]
pub struct KeyringSecretStore;

impl SecretStore for KeyringSecretStore {
    fn set(&self, key: &str, value: &str) -> AppResult<()> {
        let entry = keyring::Entry::new(SERVICE_NAME, key)?;
        entry.set_password(value)?;
        Ok(())
    }

    fn get(&self, key: &str) -> AppResult<Option<String>> {
        let entry = keyring::Entry::new(SERVICE_NAME, key)?;
        match entry.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(err) => Err(AppError::Keyring(err)),
        }
    }

    fn delete(&self, key: &str) -> AppResult<()> {
        let entry = keyring::Entry::new(SERVICE_NAME, key)?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(err) => Err(AppError::Keyring(err)),
        }
    }
}

fn set_api_key_with_store(store: &dyn SecretStore, value: &str) -> AppResult<()> {
    if value.trim().is_empty() {
        return Err(AppError::Validation(
            "Gemini API key cannot be empty".to_string(),
        ));
    }
    store.set(ACCOUNT_NAME, value.trim())
}

fn has_api_key_with_store(store: &dyn SecretStore) -> AppResult<bool> {
    Ok(store.get(ACCOUNT_NAME)?.is_some())
}

fn clear_api_key_with_store(store: &dyn SecretStore) -> AppResult<()> {
    store.delete(ACCOUNT_NAME)
}

fn read_api_key_with_store(store: &dyn SecretStore) -> AppResult<String> {
    let value = store
        .get(ACCOUNT_NAME)?
        .ok_or_else(|| AppError::Validation("Gemini API key has not been set".to_string()))?;

    if value.trim().is_empty() {
        Err(AppError::Validation(
            "Gemini API key exists but is empty".to_string(),
        ))
    } else {
        Ok(value)
    }
}

pub fn set_gemini_api_key(value: &str) -> AppResult<()> {
    set_api_key_with_store(&KeyringSecretStore, value)
}

pub fn has_gemini_api_key() -> AppResult<bool> {
    has_api_key_with_store(&KeyringSecretStore)
}

pub fn clear_gemini_api_key() -> AppResult<()> {
    clear_api_key_with_store(&KeyringSecretStore)
}

pub fn read_gemini_api_key() -> AppResult<String> {
    read_api_key_with_store(&KeyringSecretStore)
}

#[cfg(test)]
mod tests {
    use std::{cell::RefCell, collections::HashMap};

    use super::*;

    #[derive(Default)]
    struct MemorySecretStore {
        data: RefCell<HashMap<String, String>>,
    }

    impl SecretStore for MemorySecretStore {
        fn set(&self, key: &str, value: &str) -> AppResult<()> {
            self.data
                .borrow_mut()
                .insert(key.to_string(), value.to_string());
            Ok(())
        }

        fn get(&self, key: &str) -> AppResult<Option<String>> {
            Ok(self.data.borrow().get(key).cloned())
        }

        fn delete(&self, key: &str) -> AppResult<()> {
            self.data.borrow_mut().remove(key);
            Ok(())
        }
    }

    #[test]
    fn memory_store_roundtrip() {
        let store = MemorySecretStore::default();

        set_api_key_with_store(&store, "abc").expect("set should succeed");
        assert!(has_api_key_with_store(&store).expect("has should succeed"));
        assert_eq!(
            read_api_key_with_store(&store).expect("read should succeed"),
            "abc"
        );

        clear_api_key_with_store(&store).expect("clear should succeed");
        assert!(!has_api_key_with_store(&store).expect("has should succeed"));
    }

    #[test]
    fn rejects_empty_key() {
        let store = MemorySecretStore::default();
        let result = set_api_key_with_store(&store, "   ");
        assert!(result.is_err());
    }
}
