use std::path::PathBuf;

use tokio::fs;
use uuid::Uuid;

use crate::types::FileEntry;

pub struct Workspace {
    pub path: PathBuf,
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
        Ok(Workspace { path })
    }
}

impl Drop for Workspace {
    fn drop(&mut self) {
        let path = self.path.clone();
        tokio::spawn(async move {
            if let Err(e) = fs::remove_dir_all(&path).await {
                tracing::warn!(?path, ?e, "Failed to cleanup workspace");
            } else {
                tracing::debug!(?path, "Cleaned up workspace");
            }
        });
    }
}
