use axum::http::{header, Method};
use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::{api, auth, config::Config, service, AppState};

pub fn build_state(config: Config) -> AppState {
    AppState {
        config: std::sync::Arc::new(config.clone()),
        rate_limiter: std::sync::Arc::new(service::RateLimiter::new(config.concurrent_per_ip)),
    }
}

pub fn build_app(state: AppState) -> Router {
    let allowed_origins = state
        .config
        .frontend_origins
        .iter()
        .filter_map(|origin| origin.parse().ok())
        .collect::<Vec<_>>();

    let cors = if allowed_origins.is_empty() {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST])
            .allow_headers([header::CONTENT_TYPE])
            .allow_credentials(true)
    } else {
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(allowed_origins))
            .allow_methods([Method::GET, Method::POST])
            .allow_headers([header::CONTENT_TYPE])
            .allow_credentials(true)
    };

    let protected = Router::new()
        .route("/api/share", post(api::share::create_share))
        .route("/api/load/:id", get(api::share::load_share))
        .route("/ws/execute", get(api::execute::ws_execute))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            auth::auth_middleware,
        ));

    Router::new()
        .route("/health", get(api::health::health_check))
        .merge(protected)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state)
}
