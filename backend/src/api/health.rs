use axum::{Json, extract::State};

use crate::{AppState, error::AppError, types::HealthResponse};

pub async fn health_check(State(state): State<AppState>) -> Result<Json<HealthResponse>, AppError> {
    // Try to get Aptos CLI version
    let cli_version = get_aptos_version(&state.config.aptos_cli_path).await;

    Ok(Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        aptos_cli_version: cli_version,
    }))
}

async fn get_aptos_version(cli_path: &std::path::Path) -> Option<String> {
    let output = tokio::process::Command::new(cli_path)
        .arg("--version")
        .output()
        .await
        .ok()?;

    if output.status.success() {
        let version_str = String::from_utf8_lossy(&output.stdout);
        // Parse "aptos 2.4.0" -> "2.4.0"
        version_str.split_whitespace().nth(1).map(|s| s.to_string())
    } else {
        None
    }
}
