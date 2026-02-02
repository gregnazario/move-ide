use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::types::{FileEntry, LoadResponse, ShareResponse};

pub struct GistService {
    client: reqwest::Client,
    token: Option<String>,
}

#[derive(Debug, Serialize)]
struct CreateGistRequest {
    description: String,
    public: bool,
    files: HashMap<String, GistFile>,
}

#[derive(Debug, Serialize)]
struct GistFile {
    content: String,
}

#[derive(Debug, Deserialize)]
struct GistResponse {
    id: String,
    html_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PlaygroundMetadata {
    named_addresses: HashMap<String, String>,
    version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    selected_function: Option<String>,
}

impl GistService {
    pub fn new(token: Option<String>) -> Self {
        GistService {
            client: reqwest::Client::new(),
            token,
        }
    }

    pub async fn create_gist(
        &self,
        files: &[FileEntry],
        named_addresses: &HashMap<String, String>,
    ) -> Result<ShareResponse, AppError> {
        let mut gist_files: HashMap<String, GistFile> = HashMap::new();

        // Add all source files
        for file in files {
            // Replace / with _ for gist filenames (gist doesn't support directories)
            let gist_filename = file.path.replace('/', "_");
            gist_files.insert(
                gist_filename,
                GistFile {
                    content: file.content.clone(),
                },
            );
        }

        // Add metadata file
        let metadata = PlaygroundMetadata {
            named_addresses: named_addresses.clone(),
            version: "1.0".to_string(),
            selected_function: None,
        };
        gist_files.insert(
            ".playground.json".to_string(),
            GistFile {
                content: serde_json::to_string_pretty(&metadata).unwrap(),
            },
        );

        let request = CreateGistRequest {
            description: "Move Playground Snippet".to_string(),
            public: false,
            files: gist_files,
        };

        let mut req_builder = self
            .client
            .post("https://api.github.com/gists")
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "move-playground")
            .json(&request);

        if let Some(ref token) = self.token {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", token));
        }

        let response = req_builder.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::GitHub(format!(
                "Failed to create gist: {} - {}",
                status, body
            )));
        }

        let gist: GistResponse = response.json().await?;

        // Build playground URL
        let playground_url = format!("https://moveplayground.sed.fyi/?id={}", gist.id);

        Ok(ShareResponse {
            id: gist.id,
            url: playground_url,
            gist_url: gist.html_url,
        })
    }

    pub async fn load_gist(&self, id: &str) -> Result<LoadResponse, AppError> {
        let url = format!("https://api.github.com/gists/{}", id);

        let mut req_builder = self
            .client
            .get(&url)
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "move-playground");

        if let Some(ref token) = self.token {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", token));
        }

        let response = req_builder.send().await?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(AppError::NotFound(format!("Gist '{}' not found", id)));
        }

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::GitHub(format!(
                "Failed to load gist: {} - {}",
                status, body
            )));
        }

        let gist: serde_json::Value = response.json().await?;

        let mut files = Vec::new();
        let mut named_addresses = HashMap::new();
        let mut created_at = None;

        if let Some(gist_created) = gist.get("created_at").and_then(|v| v.as_str()) {
            created_at = Some(gist_created.to_string());
        }

        if let Some(gist_files) = gist.get("files").and_then(|v| v.as_object()) {
            for (filename, file_data) in gist_files {
                let content = file_data
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if filename == ".playground.json" {
                    // Parse metadata
                    if let Ok(metadata) = serde_json::from_str::<PlaygroundMetadata>(&content) {
                        named_addresses = metadata.named_addresses;
                    }
                } else {
                    // Convert gist filename back to path (replace _ with /)
                    // But be careful: sources_main.move -> sources/main.move
                    let path = if filename.starts_with("sources_") {
                        filename.replacen("sources_", "sources/", 1)
                    } else {
                        filename.clone()
                    };

                    files.push(FileEntry { path, content });
                }
            }
        }

        Ok(LoadResponse {
            files,
            named_addresses,
            created_at,
        })
    }
}
