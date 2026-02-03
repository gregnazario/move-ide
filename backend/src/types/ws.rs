use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::request::{Command, ExecuteOptions, FileEntry};
use super::response::MoveError;

/// Client → Server messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ClientMessage {
    Execute { payload: ExecutePayload },
    Cancel,
    Ping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutePayload {
    pub files: Vec<FileEntry>,
    pub command: Command,
    #[serde(default)]
    pub entry_function: Option<String>,
    #[serde(default)]
    pub named_addresses: HashMap<String, String>,
    #[serde(default)]
    pub options: ExecuteOptions,
}

/// Server → Client messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ServerMessage {
    Pong,
    Started { payload: StartedPayload },
    Stdout { payload: OutputPayload },
    Stderr { payload: OutputPayload },
    Errors { payload: ErrorsPayload },
    Done { payload: DonePayload },
    Failed { payload: FailedPayload },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartedPayload {
    pub execution_id: String,
    pub command: Command,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputPayload {
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorsPayload {
    pub errors: Vec<MoveError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishPayload {
    pub function: String,
    pub type_arguments: Vec<String>,
    pub arguments: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompiledModule {
    pub name: String,
    pub bytecode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompiledPackage {
    pub package_name: String,
    pub metadata_bcs: String,
    pub modules: Vec<CompiledModule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DonePayload {
    pub success: bool,
    pub exit_code: i32,
    pub duration_ms: u64,
    pub bytecode: Option<String>,
    pub compiled_package: Option<CompiledPackage>,
    pub publish_payload: Option<PublishPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailedPayload {
    pub reason: FailureReason,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FailureReason {
    Timeout,
    MemoryLimit,
    Cancelled,
    InternalError,
    ValidationError,
}
