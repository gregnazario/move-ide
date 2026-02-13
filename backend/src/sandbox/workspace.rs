use std::path::PathBuf;

use tokio::fs;
use uuid::Uuid;

use crate::types::FileEntry;

pub struct Workspace {
    pub path: PathBuf,
    cleaned: bool,
}

impl Workspace {
    pub async fn create(files: &[FileEntry]) -> Result<Self, std::io::Error> {
        let id = Uuid::new_v4();
        let path = std::env::temp_dir().join(format!("playground_{}", id));

        fs::create_dir_all(&path).await?;

        for file in files {
            let file_path = path.join(&file.path);

            // Create parent directories if needed
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent).await?;
            }

            fs::write(&file_path, &file.content).await?;
        }

        tracing::debug!(?path, "Created workspace");
        Ok(Workspace {
            path,
            cleaned: false,
        })
    }

    /// Explicitly clean up the workspace directory (awaited, unlike Drop).
    pub async fn cleanup(&mut self) {
        if self.cleaned {
            return;
        }
        self.cleaned = true;
        if let Err(e) = fs::remove_dir_all(&self.path).await {
            tracing::warn!(path = ?self.path, ?e, "Failed to cleanup workspace");
        } else {
            tracing::debug!(path = ?self.path, "Cleaned up workspace");
        }
    }
}

impl Drop for Workspace {
    fn drop(&mut self) {
        if self.cleaned {
            return;
        }
        // Safety net: workspace was not explicitly cleaned up (e.g. panic or early return).
        tracing::warn!(path = ?self.path, "Workspace dropped without explicit cleanup, spawning async removal");
        let path = self.path.clone();
        tokio::spawn(async move {
            if let Err(e) = fs::remove_dir_all(&path).await {
                tracing::warn!(?path, ?e, "Failed to cleanup workspace in drop");
            }
        });
    }
}

/// Remove any leftover `playground_*` directories in the temp directory.
/// Call at startup to clean up after unclean shutdowns.
pub async fn cleanup_orphaned_workspaces() {
    let tmp = std::env::temp_dir();
    let mut entries = match fs::read_dir(&tmp).await {
        Ok(entries) => entries,
        Err(e) => {
            tracing::warn!(?e, "Failed to read temp dir for orphan cleanup");
            return;
        }
    };

    let mut count = 0u32;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name();
        if let Some(name_str) = name.to_str()
            && name_str.starts_with("playground_")
        {
            let path = entry.path();
            if let Err(e) = fs::remove_dir_all(&path).await {
                tracing::warn!(?path, ?e, "Failed to remove orphaned workspace");
            } else {
                count += 1;
            }
        }
    }

    if count > 0 {
        tracing::info!(count, "Cleaned up orphaned workspaces from previous run");
    }
}
