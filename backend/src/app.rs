use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::{api, config::Config, service, AppState};

pub fn build_state(config: Config) -> AppState {
    AppState {
        config: std::sync::Arc::new(config.clone()),
        rate_limiter: std::sync::Arc::new(service::RateLimiter::new(config.concurrent_per_ip)),
    }
}

pub fn build_app(state: AppState) -> Router {
    // CORS layer - open for embeds
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(api::health::health_check))
        .route("/api/share", post(api::share::create_share))
        .route("/api/load/:id", get(api::share::load_share))
        .route("/ws/execute", get(api::execute::ws_execute))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}
