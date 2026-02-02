use serde::{Deserialize, Serialize};

use super::request::FileEntry;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub aptos_cli_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareResponse {
    pub id: String,
    pub url: String,
    pub gist_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadResponse {
    pub files: Vec<FileEntry>,
    #[serde(default)]
    pub named_addresses: std::collections::HashMap<String, String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveError {
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub end_line: Option<u32>,
    pub end_column: Option<u32>,
    pub message: String,
    pub severity: ErrorSeverity,
    pub code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ErrorSeverity {
    Error,
    Warning,
    Info,
}
