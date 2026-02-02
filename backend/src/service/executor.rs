use std::process::Stdio;

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
    ) -> Result<(i32, String), std::io::Error> {
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
            }
            crate::types::request::Command::Run => {
                cmd.args(["move", "run"]);
                if let Some(ref func) = payload.entry_function {
                    cmd.args(["--function-id", func]);
                }
                // Add named addresses
                for (name, addr) in &payload.named_addresses {
                    cmd.args(["--named-addresses", &format!("{}={}", name, addr)]);
                }
            }
            crate::types::request::Command::Test => {
                cmd.args(["move", "test", "--package-dir", "."]);
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
        let status = child.wait().await?;

        // Collect output
        let stdout_output = stdout_handle.await.unwrap_or_default();
        let stderr_output = stderr_handle.await.unwrap_or_default();

        let combined_output = format!("{}{}", stdout_output, stderr_output);
        let exit_code = status.code().unwrap_or(-1);

        Ok((exit_code, combined_output))
    }
}
