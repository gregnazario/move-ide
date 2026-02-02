use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Command {
    Compile,
    Run,
    Test,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecuteOptions {
    #[serde(default)]
    pub verbose: bool,
    #[serde(default)]
    pub include_bytecode: bool,
}
