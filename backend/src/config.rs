use std::path::PathBuf;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,

    // Execution limits
    pub timeout_secs: u64,
    pub max_memory_mb: u64,
    pub max_disk_mb: u64,
    pub max_files: usize,
    pub max_file_size_kb: usize,
    pub max_stdout_kb: usize,
    pub concurrent_per_ip: usize,

    // External services
    pub github_token: Option<String>,
    pub aptos_cli_path: PathBuf,

    // Feature flags
    pub enable_tests: bool,

    // Auth / CORS
    pub auth_jwt_secret: String,
    pub frontend_origins: Vec<String>,

    // Proxy
    pub trust_proxy_headers: bool,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let frontend_origins = std::env::var("PLAYGROUND_FRONTEND_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000".into())
            .split(',')
            .map(|origin| origin.trim().to_string())
            .filter(|origin| !origin.is_empty())
            .collect::<Vec<_>>();

        Ok(Config {
            host: std::env::var("PLAYGROUND_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: std::env::var("PLAYGROUND_PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()?,

            timeout_secs: std::env::var("PLAYGROUND_TIMEOUT_SECS")
                .unwrap_or_else(|_| "30".into())
                .parse()?,
            max_memory_mb: std::env::var("PLAYGROUND_MAX_MEMORY_MB")
                .unwrap_or_else(|_| "1024".into())
                .parse()?,
            max_disk_mb: std::env::var("PLAYGROUND_MAX_DISK_MB")
                .unwrap_or_else(|_| "100".into())
                .parse()?,
            max_files: std::env::var("PLAYGROUND_MAX_FILES")
                .unwrap_or_else(|_| "20".into())
                .parse()?,
            max_file_size_kb: std::env::var("PLAYGROUND_MAX_FILE_SIZE_KB")
                .unwrap_or_else(|_| "50".into())
                .parse()?,
            max_stdout_kb: std::env::var("PLAYGROUND_MAX_STDOUT_KB")
                .unwrap_or_else(|_| "1024".into())
                .parse()?,
            concurrent_per_ip: std::env::var("PLAYGROUND_CONCURRENT_PER_IP")
                .unwrap_or_else(|_| "2".into())
                .parse()?,

            github_token: std::env::var("GITHUB_TOKEN").ok(),
            aptos_cli_path: std::env::var("APTOS_CLI_PATH")
                .unwrap_or_else(|_| "aptos".into())
                .into(),

            enable_tests: std::env::var("PLAYGROUND_ENABLE_TESTS")
                .unwrap_or_else(|_| "true".into())
                .parse()?,

            auth_jwt_secret: std::env::var("AUTH_JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret".into()),
            frontend_origins,

            trust_proxy_headers: std::env::var("PLAYGROUND_TRUST_PROXY_HEADERS")
                .unwrap_or_else(|_| "false".into())
                .parse()?,
        })
    }
}
