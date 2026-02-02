use std::path::Path;

use crate::config::Config;
use crate::error::AppError;
use crate::types::ExecutePayload;

const ALLOWED_GIT_HOSTS: &[&str] = &["github.com", "gitlab.com"];

pub struct Validator<'a> {
    config: &'a Config,
}

impl<'a> Validator<'a> {
    pub fn new(config: &'a Config) -> Self {
        Validator { config }
    }

    pub fn validate(&self, payload: &ExecutePayload) -> Result<(), AppError> {
        self.validate_file_count(&payload.files)?;
        self.validate_file_sizes(&payload.files)?;
        self.validate_file_paths(&payload.files)?;
        self.validate_move_toml(&payload.files)?;
        self.validate_named_addresses(&payload.named_addresses)?;
        self.validate_entry_function(payload)?;
        Ok(())
    }

    fn validate_file_count(&self, files: &[crate::types::FileEntry]) -> Result<(), AppError> {
        if files.is_empty() {
            return Err(AppError::Validation("At least one file is required".into()));
        }
        if files.len() > self.config.max_files {
            return Err(AppError::Validation(format!(
                "Too many files: {} (max {})",
                files.len(),
                self.config.max_files
            )));
        }
        Ok(())
    }

    fn validate_file_sizes(&self, files: &[crate::types::FileEntry]) -> Result<(), AppError> {
        let max_bytes = self.config.max_file_size_kb * 1024;
        for file in files {
            if file.content.len() > max_bytes {
                return Err(AppError::Validation(format!(
                    "File '{}' is too large: {} KB (max {} KB)",
                    file.path,
                    file.content.len() / 1024,
                    self.config.max_file_size_kb
                )));
            }
        }
        Ok(())
    }

    fn validate_file_paths(&self, files: &[crate::types::FileEntry]) -> Result<(), AppError> {
        for file in files {
            // Reject absolute paths
            if file.path.starts_with('/') || file.path.starts_with('\\') {
                return Err(AppError::Validation(format!(
                    "Absolute paths not allowed: {}",
                    file.path
                )));
            }

            // Reject path traversal
            if file.path.contains("..") {
                return Err(AppError::Validation(format!(
                    "Path traversal not allowed: {}",
                    file.path
                )));
            }

            // Reject hidden files
            if file.path.split('/').any(|p| p.starts_with('.') && p != ".") {
                return Err(AppError::Validation(format!(
                    "Hidden files not allowed: {}",
                    file.path
                )));
            }

            // Whitelist extensions
            let ext = Path::new(&file.path).extension().and_then(|e| e.to_str());
            match ext {
                Some("move") | Some("toml") => {}
                _ => {
                    return Err(AppError::Validation(format!(
                        "Invalid file extension: {} (allowed: .move, .toml)",
                        file.path
                    )));
                }
            }
        }
        Ok(())
    }

    fn validate_move_toml(&self, files: &[crate::types::FileEntry]) -> Result<(), AppError> {
        let move_toml = files.iter().find(|f| f.path == "Move.toml");

        if let Some(toml_file) = move_toml {
            let parsed: toml::Value = toml::from_str(&toml_file.content)
                .map_err(|e| AppError::Validation(format!("Invalid Move.toml: {}", e)))?;

            // Must have [package] section
            if parsed.get("package").is_none() {
                return Err(AppError::Validation(
                    "Move.toml must have a [package] section".into(),
                ));
            }

            // Validate git dependencies
            if let Some(deps) = parsed.get("dependencies") {
                self.validate_dependencies(deps)?;
            }
        }

        Ok(())
    }

    fn validate_dependencies(&self, deps: &toml::Value) -> Result<(), AppError> {
        if let Some(table) = deps.as_table() {
            for (name, value) in table {
                if let Some(git_url) = value.get("git").and_then(|v| v.as_str()) {
                    self.validate_git_url(git_url).map_err(|_| {
                        AppError::Validation(format!(
                            "Dependency '{}' has disallowed git host. Allowed: {:?}",
                            name, ALLOWED_GIT_HOSTS
                        ))
                    })?;
                }
            }
        }
        Ok(())
    }

    fn validate_git_url(&self, url: &str) -> Result<(), ()> {
        // Handle both https:// and git@ formats
        let host = if url.starts_with("https://") {
            url.trim_start_matches("https://").split('/').next()
        } else if url.starts_with("git@") {
            url.trim_start_matches("git@").split(':').next()
        } else {
            return Err(());
        };

        match host {
            Some(h) if ALLOWED_GIT_HOSTS.contains(&h) => Ok(()),
            _ => Err(()),
        }
    }

    fn validate_named_addresses(
        &self,
        addresses: &std::collections::HashMap<String, String>,
    ) -> Result<(), AppError> {
        const RESERVED: &[&str] = &[
            "std",
            "aptos_std",
            "aptos_framework",
            "aptos_token",
            "aptos_token_objects",
        ];

        for (name, addr) in addresses {
            // Check reserved names
            if RESERVED.contains(&name.as_str()) {
                return Err(AppError::Validation(format!(
                    "Cannot override reserved address: {}",
                    name
                )));
            }

            // Validate address format (hex or placeholder)
            if addr != "_" {
                if !addr.starts_with("0x") {
                    return Err(AppError::Validation(format!(
                        "Invalid address format for '{}': must start with 0x or be _",
                        name
                    )));
                }
                let hex_part = &addr[2..];
                if hex_part.is_empty() || hex_part.len() > 64 {
                    return Err(AppError::Validation(format!(
                        "Invalid address length for '{}': {} chars (max 64)",
                        name,
                        hex_part.len()
                    )));
                }
                if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
                    return Err(AppError::Validation(format!(
                        "Invalid hex digits in address '{}'",
                        name
                    )));
                }
            }
        }

        Ok(())
    }

    fn validate_entry_function(&self, payload: &ExecutePayload) -> Result<(), AppError> {
        if matches!(payload.command, crate::types::request::Command::Run)
            && payload
                .entry_function
                .as_ref()
                .map(|entry| entry.trim().is_empty())
                .unwrap_or(true)
        {
            return Err(AppError::Validation(
                "Entry function is required for run commands".into(),
            ));
        }

        Ok(())
    }
}
