import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    pollExecution,
    startExecution,
    streamExecution,
} from "../lib/serverlessClient";
import { useWorkspaceStore } from "../store";
import type {
    Command,
    DonePayload,
    ExecutePayload,
    ServerMessage,
} from "../types/execute";
import { useWebSocket } from "./useWebSocket";

const WS_FALLBACK_MS = 3000;
const POLL_INTERVAL_MS = 1500;

export function useExecution() {
    const [mode, setMode] = useState<"websocket" | "serverless">("websocket");
    const [wsAttempted, setWsAttempted] = useState(false);
    const wsFallbackNotified = useRef(false);
    const pendingRef = useRef<{
        resolve: (payload: DonePayload) => void;
        reject: (error: Error) => void;
    } | null>(null);

    const { wsStatus, setIsExecuting, addOutput, setErrors, clearOutput } =
        useWorkspaceStore();

    const wsEnabled = mode === "websocket";
    const { execute: wsExecute, executeWithResult: wsExecuteWithResult } =
        useWebSocket({ enabled: wsEnabled });

    useEffect(() => {
        if (mode !== "websocket") return;
        if (wsStatus === "connected") {
            setWsAttempted(true);
            return;
        }

        const timeout = setTimeout(() => {
            setMode("serverless");
            if (!wsFallbackNotified.current) {
                wsFallbackNotified.current = true;
                toast.message("WebSocket unavailable, using serverless mode");
            }
            setWsAttempted(true);
        }, WS_FALLBACK_MS);

        return () => clearTimeout(timeout);
    }, [mode, wsStatus]);

    const handleMessage = useCallback(
        (msg: ServerMessage) => {
            switch (msg.type) {
                case "pong":
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
                        pendingRef.current.reject(
                            new Error(msg.payload.message),
                        );
                        pendingRef.current = null;
                    }
                    break;
            }
        },
        [addOutput, setErrors, setIsExecuting],
    );

    const buildPayload = useCallback(
        (command: Command, options?: { include_bytecode?: boolean }) => {
            const { files, namedAddresses, selectedFunction } =
                useWorkspaceStore.getState();

            const filesArray = Array.from(files.values()).map((f) => ({
                path: f.path,
                content: f.content,
            }));

            const payload: ExecutePayload = {
                files: filesArray,
                command,
                entry_function:
                    command === "run"
                        ? (selectedFunction ?? undefined)
                        : undefined,
                named_addresses: namedAddresses,
                options: { include_bytecode: options?.include_bytecode },
            };

            return payload;
        },
        [],
    );

    const executeServerless = useCallback(
        async (command: Command, options?: { include_bytecode?: boolean }) => {
            clearOutput();
            setErrors([]);

            try {
                const payload = buildPayload(command, options);
                const executionId = await startExecution(payload);

                let cursor = -1;
                let done = false;
                let streamActive = true;

                const stopStream = streamExecution(
                    executionId,
                    (message, eventCursor) => {
                        handleMessage(message);
                        cursor = Math.max(cursor, eventCursor);
                        if (
                            message.type === "done" ||
                            message.type === "failed"
                        ) {
                            done = true;
                        }
                    },
                    () => {
                        streamActive = false;
                    },
                    (err) => {
                        console.error("SSE error", err);
                        streamActive = false;
                    },
                    cursor,
                );

                while (!done) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, POLL_INTERVAL_MS),
                    );
                    if (streamActive) {
                        continue;
                    }
                    try {
                        const result = await pollExecution(executionId, cursor);
                        for (const event of result.events) {
                            handleMessage(event);
                            if (
                                event.type === "done" ||
                                event.type === "failed"
                            ) {
                                done = true;
                            }
                        }
                        cursor = Math.max(cursor, result.nextCursor);
                        if (
                            result.status === "done" ||
                            result.status === "failed"
                        ) {
                            done = true;
                        }
                    } catch (err) {
                        console.error("Polling error", err);
                    }
                }

                stopStream();
            } catch (err) {
                handleMessage({
                    type: "failed",
                    payload: {
                        message:
                            (err as Error).message ||
                            "Serverless execution failed",
                    },
                });
            }
        },
        [buildPayload, clearOutput, handleMessage, setErrors],
    );

    const execute = useCallback(
        async (command: Command, options?: { include_bytecode?: boolean }) => {
            if (mode === "websocket" && wsStatus === "connected") {
                await wsExecute(command, options);
                return;
            }

            await executeServerless(command, options);
        },
        [executeServerless, mode, wsExecute, wsStatus],
    );

    const executeWithResult = useCallback(
        async (command: Command, options?: { include_bytecode?: boolean }) => {
            if (mode === "websocket" && wsStatus === "connected") {
                return wsExecuteWithResult(command, options);
            }

            if (pendingRef.current) {
                throw new Error("Another command is already in progress");
            }

            return new Promise<DonePayload>((resolve, reject) => {
                pendingRef.current = { resolve, reject };
                void executeServerless(command, options);
            });
        },
        [executeServerless, mode, wsExecuteWithResult, wsStatus],
    );

    const resolvedMode = useMemo(() => {
        if (mode === "serverless") return "serverless";
        if (wsStatus === "connected") return "websocket";
        if (wsAttempted) return "serverless";
        return "websocket";
    }, [mode, wsAttempted, wsStatus]);

    return { execute, executeWithResult, mode: resolvedMode };
}
