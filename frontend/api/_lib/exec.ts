import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type ExecutePayload = {
    files: Array<{ path: string; content: string }>;
    command: "compile" | "run" | "test" | "build_publish_payload";
    entry_function?: string;
    named_addresses?: Record<string, string>;
    options?: { include_bytecode?: boolean };
};

export type ExecutionResult = {
    exitCode: number;
    durationMs: number;
    publishPayload?: {
        function: string;
        type_arguments: string[];
        arguments: unknown[];
    } | null;
};

const DEFAULT_APTOS_PATH = "aptos";

function getAptosPath() {
    return process.env.APTOS_CLI_PATH ?? DEFAULT_APTOS_PATH;
}

async function writeFiles(root: string, files: ExecutePayload["files"]) {
    for (const file of files) {
        const filePath = path.join(root, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content, "utf8");
    }
}

function buildArgs(payload: ExecutePayload, workspace: string): string[] {
    switch (payload.command) {
        case "compile": {
            const args = ["move", "compile", "--package-dir", "."];
            addNamedAddresses(args, payload.named_addresses);
            return args;
        }
        case "test": {
            const args = ["move", "test", "--package-dir", "."];
            addNamedAddresses(args, payload.named_addresses);
            return args;
        }
        case "run": {
            const args = ["move", "run"];
            if (payload.entry_function) {
                args.push("--function-id", payload.entry_function);
            }
            return args;
        }
        case "build_publish_payload": {
            const outputPath = path.join(workspace, "publish-payload.json");
            const args = [
                "move",
                "build-publish-payload",
                "--json-output-file",
                outputPath,
                "--package-dir",
                ".",
            ];
            addNamedAddresses(args, payload.named_addresses);
            return args;
        }
    }
}

function addNamedAddresses(
    args: string[],
    namedAddresses?: Record<string, string>,
) {
    if (!namedAddresses) return;
    for (const [name, addr] of Object.entries(namedAddresses)) {
        args.push("--named-addresses", `${name}=${addr}`);
    }
}

async function readPublishPayload(root: string) {
    const publishPath = path.join(root, "publish-payload.json");
    const contents = await fs.readFile(publishPath, "utf8");
    return JSON.parse(contents);
}

export async function runExecution(
    payload: ExecutePayload,
    onStdout: (data: string) => Promise<void> | void,
    onStderr: (data: string) => Promise<void> | void,
): Promise<ExecutionResult> {
    const start = Date.now();
    const workspace = await fs.mkdtemp(
        path.join(os.tmpdir(), "move-playground-"),
    );

    try {
        await writeFiles(workspace, payload.files);

        const args = buildArgs(payload, workspace);
        const child = spawn(getAptosPath(), args, {
            cwd: workspace,
            env: { ...process.env, HOME: workspace },
        });

        child.stdout?.on("data", (chunk) => {
            void onStdout(chunk.toString());
        });

        child.stderr?.on("data", (chunk) => {
            void onStderr(chunk.toString());
        });

        const exitCode: number = await new Promise((resolve) => {
            child.on("close", (code) => resolve(code ?? -1));
        });

        let publishPayload: ExecutionResult["publishPayload"] = null;
        if (exitCode === 0 && payload.command === "build_publish_payload") {
            try {
                publishPayload = await readPublishPayload(workspace);
            } catch {
                publishPayload = null;
            }
        }

        return {
            exitCode,
            durationMs: Date.now() - start,
            publishPayload,
        };
    } finally {
        await fs.rm(workspace, { recursive: true, force: true });
    }
}
