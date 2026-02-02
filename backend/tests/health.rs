use axum::{body::Body, http::Request, http::StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

use playground_backend::{app, config::Config};

#[tokio::test]
async fn health_returns_ok() {
    let config = Config::from_env().expect("config should load");
    let state = app::build_state(config);
    let app = app::build_app(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("request should succeed");

    assert_eq!(response.status(), StatusCode::OK);

    let body = response
        .into_body()
        .collect()
        .await
        .expect("body should collect")
        .to_bytes();

    let json: serde_json::Value = serde_json::from_slice(&body).expect("json should parse");
    assert_eq!(json["status"], "healthy");
}
