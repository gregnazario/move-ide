use std::net::SocketAddr;
use std::time::Instant;

use axum::{
    extract::{
        ws::{Message, WebSocket},
        ConnectInfo, State, WebSocketUpgrade,
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::{
    sandbox::Workspace,
    service::{Executor, Parser, Validator},
    types::*,
    AppState,
};

pub async fn ws_execute(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    tracing::info!(?addr, "New WebSocket connection");
    ws.on_upgrade(move |socket| handle_socket(socket, state, addr))
}

async fn handle_socket(socket: WebSocket, state: AppState, addr: SocketAddr) {
    let (mut sender, mut receiver) = socket.split();

    // Try to acquire rate limit slot
    let _guard = match state.rate_limiter.try_acquire(addr.ip()) {
        Ok(guard) => guard,
        Err(_) => {
            let msg = ServerMessage::Failed {
                payload: FailedPayload {
                    reason: FailureReason::InternalError,
                    message: "Too many concurrent connections from this IP".into(),
                },
            };
            let _ = sender
                .send(Message::Text(serde_json::to_string(&msg).unwrap()))
                .await;
            return;
        }
    };

    // Channel for sending messages back to client
    let (tx, mut rx) = mpsc::channel::<ServerMessage>(32);

    // Spawn task to forward messages to WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&msg) {
                if sender.send(Message::Text(json)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Handle incoming messages
    while let Some(msg) = receiver.next().await {
        let msg = match msg {
            Ok(Message::Text(text)) => text.to_string(),
            Ok(Message::Close(_)) => break,
            _ => continue,
        };

        let client_msg: ClientMessage = match serde_json::from_str(&msg) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(?e, "Invalid message format");
                continue;
            }
        };

        match client_msg {
            ClientMessage::Ping => {
                let _ = tx.send(ServerMessage::Pong).await;
            }
            ClientMessage::Cancel => {
                // TODO: Implement cancellation
                tracing::info!("Execution cancel requested");
            }
            ClientMessage::Execute { payload } => {
                handle_execute(payload, &state, tx.clone()).await;
            }
        }
    }

    send_task.abort();
    tracing::info!(?addr, "WebSocket connection closed");
}

async fn handle_execute(
    payload: ExecutePayload,
    state: &AppState,
    tx: mpsc::Sender<ServerMessage>,
) {
    let execution_id = Uuid::new_v4().to_string();
    let start = Instant::now();

    // Send started message
    let _ = tx
        .send(ServerMessage::Started {
            payload: StartedPayload {
                execution_id: execution_id.clone(),
                command: payload.command.clone(),
            },
        })
        .await;

    // Validate input
    let validator = Validator::new(&state.config);
    if let Err(e) = validator.validate(&payload) {
        let _ = tx
            .send(ServerMessage::Failed {
                payload: FailedPayload {
                    reason: FailureReason::ValidationError,
                    message: e.to_string(),
                },
            })
            .await;
        return;
    }

    // Create workspace
    let workspace = match Workspace::create(&payload.files).await {
        Ok(w) => w,
        Err(e) => {
            let _ = tx
                .send(ServerMessage::Failed {
                    payload: FailedPayload {
                        reason: FailureReason::InternalError,
                        message: format!("Failed to create workspace: {}", e),
                    },
                })
                .await;
            return;
        }
    };

    // Execute with timeout
    let executor = Executor::new(&state.config);
    let result = executor.execute(&workspace, &payload, tx.clone()).await;

    match result {
        Ok((exit_code, output, compiled_package, publish_payload)) => {
            // Parse errors from output
            let errors = Parser::parse_errors(&output);
            if !errors.is_empty() {
                let _ = tx
                    .send(ServerMessage::Errors {
                        payload: ErrorsPayload { errors },
                    })
                    .await;
            }

            let _ = tx
                .send(ServerMessage::Done {
                    payload: DonePayload {
                        success: exit_code == 0,
                        exit_code,
                        duration_ms: start.elapsed().as_millis() as u64,
                        bytecode: None,
                        compiled_package,
                        publish_payload,
                    },
                })
                .await;
        }
        Err(e) if e.kind() == std::io::ErrorKind::TimedOut => {
            let _ = tx
                .send(ServerMessage::Failed {
                    payload: FailedPayload {
                        reason: FailureReason::Timeout,
                        message: format!(
                            "Execution timed out after {} seconds",
                            state.config.timeout_secs
                        ),
                    },
                })
                .await;
        }
        Err(e) => {
            let _ = tx
                .send(ServerMessage::Failed {
                    payload: FailedPayload {
                        reason: FailureReason::InternalError,
                        message: e.to_string(),
                    },
                })
                .await;
        }
    }

    // Workspace is automatically cleaned up when dropped
}
