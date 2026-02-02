use std::sync::Arc;

pub mod api;
pub mod app;
pub mod config;
pub mod error;
pub mod sandbox;
pub mod service;
pub mod types;

use config::Config;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub rate_limiter: Arc<service::RateLimiter>,
}
