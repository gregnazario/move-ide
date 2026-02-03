use std::process::Stdio;
use std::{fs, io, path::Path};

use base64::Engine;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

use crate::config::Config;
use crate::sandbox::Workspace;
use crate::types::*;

pub struct Executor<'a> {
    config: &'a Config,
}

impl<'a> Executor<'a> {
    pub fn new(config: &'a Config) -> Self {
        Executor { config }
    }

    pub async fn execute(
        &self,
        workspace: &Workspace,
        payload: &ExecutePayload,
        tx: mpsc::Sender<ServerMessage>,
    ) -> Result<(i32, String, Option<CompiledPackage>, Option<PublishPayload>), std::io::Error>
    {
        let mut cmd = Command::new(&self.config.aptos_cli_path);

        // Set working directory
        cmd.current_dir(&workspace.path);

        // Environment isolation
        cmd.env_clear();
        cmd.env("HOME", &workspace.path);
        cmd.env("PATH", "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin");

        // Build command args based on command type
        match &payload.command {
            crate::types::request::Command::Compile => {
                cmd.args(["move", "compile", "--package-dir", "."]);
                if !payload.named_addresses.is_empty() {
                    for (name, addr) in &payload.named_addresses {
                        cmd.args(["--named-addresses", &format!("{}={}", name, addr)]);
                    }
                }
            }
            crate::types::request::Command::Run => {
                cmd.args(["move", "run"]);
                if let Some(ref func) = payload.entry_function {
                    cmd.args(["--function-id", func]);
                }
            }
            crate::types::request::Command::Test => {
                cmd.args(["move", "test", "--package-dir", "."]);
                if !payload.named_addresses.is_empty() {
                    for (name, addr) in &payload.named_addresses {
                        cmd.args(["--named-addresses", &format!("{}={}", name, addr)]);
                    }
                }
            }
            crate::types::request::Command::BuildPublishPayload => {
                let output_path = workspace.path.join("publish-payload.json");
                cmd.args([
                    "move",
                    "build-publish-payload",
                    "--json-output-file",
                    output_path.to_string_lossy().as_ref(),
                    "--package-dir",
                    ".",
                ]);
                if !payload.named_addresses.is_empty() {
                    for (name, addr) in &payload.named_addresses {
                        cmd.args(["--named-addresses", &format!("{}={}", name, addr)]);
                    }
                }
            }
        }

        // Capture output
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn()?;

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        // Stream stdout
        let tx_stdout = tx.clone();
        let stdout_handle = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut output = String::new();
            while let Ok(Some(line)) = lines.next_line().await {
                output.push_str(&line);
                output.push('\n');
                let _ = tx_stdout
                    .send(ServerMessage::Stdout {
                        payload: OutputPayload {
                            data: format!("{}\n", line),
                        },
                    })
                    .await;
            }
            output
        });

        // Stream stderr
        let tx_stderr = tx.clone();
        let stderr_handle = tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            let mut output = String::new();
            while let Ok(Some(line)) = lines.next_line().await {
                output.push_str(&line);
                output.push('\n');
                let _ = tx_stderr
                    .send(ServerMessage::Stderr {
                        payload: OutputPayload {
                            data: format!("{}\n", line),
                        },
                    })
                    .await;
            }
            output
        });

        // Wait for process to exit
        let status = match tokio::time::timeout(
            std::time::Duration::from_secs(self.config.timeout_secs),
            child.wait(),
        )
        .await
        {
            Ok(Ok(status)) => status,
            Ok(Err(e)) => return Err(e),
            Err(_) => {
                let _ = child.kill().await;
                let _ = child.wait().await;
                stdout_handle.abort();
                stderr_handle.abort();
                return Err(io::Error::new(
                    io::ErrorKind::TimedOut,
                    "Execution timed out",
                ));
            }
        };

        // Collect output
        let stdout_output = stdout_handle.await.unwrap_or_default();
        let stderr_output = stderr_handle.await.unwrap_or_default();

        let combined_output = format!("{}{}", stdout_output, stderr_output);
        let exit_code = status.code().unwrap_or(-1);

        let compiled_package = if exit_code == 0
            && matches!(payload.command, crate::types::request::Command::Compile)
            && payload.options.include_bytecode
        {
            read_compiled_package(&workspace.path).ok()
        } else {
            None
        };

        let publish_payload = if exit_code == 0
            && matches!(
                payload.command,
                crate::types::request::Command::BuildPublishPayload
            ) {
            read_publish_payload(&workspace.path).ok()
        } else {
            None
        };

        Ok((
            exit_code,
            combined_output,
            compiled_package,
            publish_payload,
        ))
    }
}

fn read_compiled_package(workspace_path: &Path) -> io::Result<CompiledPackage> {
    let move_toml = fs::read_to_string(workspace_path.join("Move.toml"))?;
    let parsed: toml::Value = toml::from_str(&move_toml)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
    let package_name = parsed
        .get("package")
        .and_then(|pkg| pkg.get("name"))
        .and_then(|value| value.as_str())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                "Move.toml is missing package.name",
            )
        })?;

    let build_dir = workspace_path.join("build").join(package_name);
    let metadata_path = build_dir.join("package-metadata.bcs");
    let metadata_bytes = fs::read(metadata_path)?;
    let metadata_bcs = base64::engine::general_purpose::STANDARD.encode(metadata_bytes);

    let modules_dir = build_dir.join("bytecode_modules");
    let mut modules = Vec::new();
    for entry in fs::read_dir(modules_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("mv") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("module")
            .to_string();
        let bytes = fs::read(path)?;
        let bytecode = base64::engine::general_purpose::STANDARD.encode(bytes);
        modules.push(CompiledModule { name, bytecode });
    }

    Ok(CompiledPackage {
        package_name: package_name.to_string(),
        metadata_bcs,
        modules,
    })
}

fn read_publish_payload(workspace_path: &Path) -> io::Result<PublishPayload> {
    let payload_path = workspace_path.join("publish-payload.json");
    let contents = fs::read_to_string(payload_path)?;
    let payload: PublishPayload = serde_json::from_str(&contents)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
    Ok(payload)
}
