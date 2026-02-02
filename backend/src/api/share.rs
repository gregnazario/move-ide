use std::collections::HashMap;

use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    service::GistService,
    types::{FileEntry, LoadResponse, ShareResponse},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct ShareRequest {
    pub files: Vec<FileEntry>,
    #[serde(default)]
    pub named_addresses: HashMap<String, String>,
}

pub async fn create_share(
    State(state): State<AppState>,
    Json(req): Json<ShareRequest>,
) -> Result<Json<ShareResponse>, AppError> {
    // Validate files
    if req.files.is_empty() {
        return Err(AppError::Validation("At least one file is required".into()));
    }
    if req.files.len() > state.config.max_files {
        return Err(AppError::Validation(format!(
            "Too many files: {} (max {})",
            req.files.len(),
            state.config.max_files
        )));
    }

    let gist_service = GistService::new(state.config.github_token.clone());
    let response = gist_service
        .create_gist(&req.files, &req.named_addresses)
        .await?;

    Ok(Json(response))
}

pub async fn load_share(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<LoadResponse>, AppError> {
    let gist_service = GistService::new(state.config.github_token.clone());
    let response = gist_service.load_gist(&id).await?;

    Ok(Json(response))
}
