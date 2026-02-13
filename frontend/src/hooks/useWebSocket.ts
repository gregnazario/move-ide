import { useCallback, useEffect, useRef } from "react";
import { BACKEND_URL } from "../lib/config";
import { useWorkspaceStore } from "../store";
import type { DonePayload, ServerMessage } from "../types/execute";

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const reconnectAttemptsRef = useRef(0);
    const pendingRef = useRef<{
        resolve: (payload: DonePayload) => void;
        reject: (error: Error) => void;
    } | null>(null);

    const { setWsStatus, setIsExecuting, addOutput, setErrors, clearOutput } =
        useWorkspaceStore();

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setWsStatus("connecting");

        let baseUrl: URL;
        if (BACKEND_URL) {
            try {
                baseUrl = new URL(BACKEND_URL);
            } catch (e) {
                console.error(
                    "Invalid BACKEND_URL, falling back to same-origin for WebSocket:",
                    e,
                );
                baseUrl = new URL(window.location.origin);
            }
        } else {
            baseUrl = new URL(window.location.origin);
        }

        const wsProtocol =
            baseUrl.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${baseUrl.host}/ws/execute`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsStatus("connected");
            reconnectAttemptsRef.current = 0;
        };

        ws.onclose = () => {
            setWsStatus("disconnected");
            wsRef.current = null;

            // Reconnect with exponential backoff
            const delay = Math.min(
                1000 * 2 ** reconnectAttemptsRef.current,
                30000,
            );
            reconnectAttemptsRef.current++;

            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
        };

        ws.onerror = () => {
            setWsStatus("error");
        };

        ws.onmessage = (event) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);
                handleMessage(msg);
            } catch (e) {
                console.error("Failed to parse WebSocket message:", e);
            }
        };
    }, [setWsStatus]);

    const handleMessage = (msg: ServerMessage) => {
        switch (msg.type) {
            case "pong":
                // Heartbeat response
                break;

            case "started":
                setIsExecuting(true);
                addOutput({
                    type: "system",
                    content: `Starting ${msg.payload.command}...`,
                    timestamp: Date.now(),
                });
                break;

            case "stdout":
                addOutput({
                    type: "stdout",
                    content: msg.payload.data,
                    timestamp: Date.now(),
                });
                break;

            case "stderr":
                addOutput({
                    type: "stderr",
                    content: msg.payload.data,
                    timestamp: Date.now(),
                });
                break;

            case "errors":
                setErrors(msg.payload.errors);
                break;

            case "done":
                setIsExecuting(false);
                addOutput({
                    type: msg.payload.success ? "success" : "error",
                    content: msg.payload.success
                        ? `Completed in ${msg.payload.duration_ms}ms`
                        : `Failed with exit code ${msg.payload.exit_code}`,
                    timestamp: Date.now(),
                });
                if (pendingRef.current) {
                    pendingRef.current.resolve(msg.payload);
                    pendingRef.current = null;
                }
                break;

            case "failed":
                setIsExecuting(false);
                addOutput({
                    type: "error",
                    content: `Error: ${msg.payload.message}`,
                    timestamp: Date.now(),
                });
                if (pendingRef.current) {
                    pendingRef.current.reject(new Error(msg.payload.message));
                    pendingRef.current = null;
                }
                break;
        }
    };

    const execute = useCallback(
        async (
            command: "compile" | "run" | "test" | "build_publish_payload",
            options?: { include_bytecode?: boolean },
        ) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.error("WebSocket not connected");
                return;
            }

            const { files, namedAddresses, selectedFunction } =
                useWorkspaceStore.getState();

            clearOutput();
            setErrors([]);

            const filesArray = Array.from(files.values()).map((f) => ({
                path: f.path,
                content: f.content,
            }));

            const message = {
                type: "execute",
                payload: {
                    files: filesArray,
                    command,
                    entry_function:
                        command === "run" ? selectedFunction : undefined,
                    named_addresses: namedAddresses,
                    options: { include_bytecode: options?.include_bytecode },
                },
            };

            wsRef.current.send(JSON.stringify(message));
        },
        [clearOutput, setErrors],
    );

    const executeWithResult = useCallback(
        async (
            command: "compile" | "run" | "test" | "build_publish_payload",
            options?: { include_bytecode?: boolean },
        ) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                throw new Error("WebSocket not connected");
            }
            if (pendingRef.current) {
                throw new Error("Another command is already in progress");
            }
            return new Promise<DonePayload>((resolve, reject) => {
                pendingRef.current = { resolve, reject };
                void execute(command, options);
            });
        },
        [execute],
    );

    // Connect on mount
    useEffect(() => {
        connect();

        // Keepalive ping
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000);

        return () => {
            clearInterval(pingInterval);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            wsRef.current?.close();
        };
    }, [connect]);

    return { execute, executeWithResult };
}
