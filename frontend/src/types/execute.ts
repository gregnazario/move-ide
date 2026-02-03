import type { MoveError } from "../store";

export type Command = "compile" | "run" | "test" | "build_publish_payload";

export type ExecutePayload = {
    files: Array<{ path: string; content: string }>;
    command: Command;
    entry_function?: string;
    named_addresses?: Record<string, string>;
    options?: { include_bytecode?: boolean };
};

type CompiledModule = {
    name: string;
    bytecode: string;
};

type CompiledPackage = {
    package_name: string;
    metadata_bcs: string;
    modules: CompiledModule[];
};

export type DonePayload = {
    success: boolean;
    duration_ms: number;
    exit_code: number;
    compiled_package?: CompiledPackage | null;
    publish_payload?: {
        function: string;
        type_arguments: string[];
        arguments: unknown[];
    } | null;
};

export type ServerMessage =
    | { type: "pong" }
    | { type: "started"; payload: { command: string } }
    | { type: "stdout"; payload: { data: string } }
    | { type: "stderr"; payload: { data: string } }
    | { type: "errors"; payload: { errors: MoveError[] } }
    | { type: "done"; payload: DonePayload }
    | { type: "failed"; payload: { message: string } };
