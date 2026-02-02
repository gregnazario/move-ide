use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod error;
mod sandbox;
mod service;
mod types;

use config::Config;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub rate_limiter: Arc<service::RateLimiter>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));

    tracing::info!("Starting Aptos Move Playground backend on {}", addr);

    // Create app state
    let state = AppState {
        config: Arc::new(config.clone()),
        rate_limiter: Arc::new(service::RateLimiter::new(config.concurrent_per_ip)),
    };

    // CORS layer - open for embeds
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(api::health::health_check))
        .route("/api/share", post(api::share::create_share))
        .route("/api/load/:id", get(api::share::load_share))
        .route("/ws/execute", get(api::execute::ws_execute))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
