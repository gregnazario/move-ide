use axum::{
    body::Body,
    extract::State,
    http::{HeaderMap, Request},
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::Deserialize;

use crate::{error::AppError, AppState};

const ISSUER: &str = "move-playground";
const AUDIENCE: &str = "move-playground-backend";

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Claims {
    iss: String,
    aud: String,
    exp: usize,
    origin: String,
    jti: String,
}

pub async fn auth_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let headers = req.headers();
    let path = req.uri().path().to_string();

    let origin = match extract_origin(headers) {
        Some(origin) => origin,
        None => {
            tracing::warn!(path = %path, "Auth rejected: missing Origin/Referer header");
            return AppError::Unauthorized("Missing Origin/Referer".into()).into_response();
        }
    };

    if !is_origin_allowed(&origin, &state.config.frontend_origins) {
        tracing::warn!(
            path = %path,
            origin = %origin,
            allowed = ?state.config.frontend_origins,
            "Auth rejected: origin not allowed"
        );
        return AppError::Unauthorized("Origin not allowed".into()).into_response();
    }

    let token = match extract_cookie(headers, "mp_auth") {
        Some(token) => token,
        None => {
            let cookie_header = headers.get("cookie").and_then(|v| v.to_str().ok()).unwrap_or("<none>");
            tracing::warn!(
                path = %path,
                origin = %origin,
                cookies = %cookie_header,
                "Auth rejected: missing mp_auth cookie"
            );
            return AppError::Unauthorized("Missing auth cookie".into()).into_response();
        }
    };

    if let Err(err) = verify_token(&token, &origin, &state.config.auth_jwt_secret) {
        tracing::warn!(path = %path, origin = %origin, error = %err, "Auth rejected: token verification failed");
        return AppError::Unauthorized(err).into_response();
    }

    next.run(req).await
}

fn extract_origin(headers: &HeaderMap) -> Option<String> {
    if let Some(origin) = headers.get("origin") {
        return origin.to_str().ok().map(|value| value.to_string());
    }

    if let Some(referer) = headers.get("referer") {
        if let Ok(value) = referer.to_str() {
            let mut parts = value.split('/');
            let scheme = parts.next()?;
            let _ = parts.next()?;
            let host = parts.next()?;
            return Some(format!("{scheme}//{host}"));
        }
    }

    None
}

fn is_origin_allowed(origin: &str, allowed: &[String]) -> bool {
    allowed
        .iter()
        .any(|allowed_origin| origin == allowed_origin)
}

fn extract_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    let cookie_header = headers.get("cookie")?.to_str().ok()?;
    cookie_header
        .split(';')
        .map(|part| part.trim())
        .find_map(|part| match part.split_once('=') {
            Some((key, value)) if key == name => Some(value.to_string()),
            _ => None,
        })
}

fn verify_token(token: &str, origin: &str, secret: &str) -> Result<(), String> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[ISSUER]);
    validation.set_audience(&[AUDIENCE]);

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|_| "Invalid token".to_string())?;

    if token_data.claims.origin != origin {
        return Err("Origin mismatch".into());
    }

    Ok(())
}
