import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface FileContent {
    path: string;
    content: string;
    isDirty: boolean;
}

export interface MoveError {
    file: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    message: string;
    severity: "error" | "warning" | "info";
    code?: string;
}

export interface OutputLine {
    type: "stdout" | "stderr" | "system" | "success" | "error";
    content: string;
    timestamp: number;
}

export interface FunctionInfo {
    module: string;
    name: string;
    fullName: string;
    isEntry: boolean;
    isTest: boolean;
    line: number;
}

type WsStatus = "connecting" | "connected" | "disconnected" | "error";

interface WorkspaceState {
    // Files
    files: Map<string, FileContent>;
    activeFile: string | null;
    openTabs: string[];

    // Execution
    namedAddresses: Record<string, string>;
    selectedFunction: string | null;
    availableFunctions: FunctionInfo[];

    // Output
    output: OutputLine[];
    errors: MoveError[];
    isExecuting: boolean;

    // Connection
    wsStatus: WsStatus;

    // Sharing
    gistId: string | null;

    // Actions
    createFile: (path: string, content?: string) => void;
    deleteFile: (path: string) => void;
    renameFile: (oldPath: string, newPath: string) => void;
    updateFileContent: (path: string, content: string) => void;
    setActiveFile: (path: string | null) => void;
    openTab: (path: string) => void;
    closeTab: (path: string) => void;

    setNamedAddresses: (addresses: Record<string, string>) => void;
    setSelectedFunction: (func: string | null) => void;
    setAvailableFunctions: (funcs: FunctionInfo[]) => void;

    addOutput: (line: OutputLine) => void;
    clearOutput: () => void;
    setErrors: (errors: MoveError[]) => void;
    setIsExecuting: (executing: boolean) => void;
    setWsStatus: (status: WsStatus) => void;

    setGistId: (id: string | null) => void;

    loadTemplate: () => void;
    reset: () => void;
}

const DEFAULT_MOVE_TOML = `[package]
name = "playground"
version = "0.0.1"

[addresses]
playground = "_"

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
subdir = "aptos-move/framework/aptos-framework"
rev = "mainnet"
`;

const DEFAULT_MAIN_MOVE = `module playground::main {
    use std::debug;
    use std::string;

    public entry fun hello() {
        let message = string::utf8(b"Hello, Move Playground!");
        debug::print(&message);
    }

    #[test]
    fun test_hello() {
        hello();
    }
}
`;

const createDefaultFiles = (): Map<string, FileContent> => {
    const files = new Map<string, FileContent>();
    files.set("Move.toml", {
        path: "Move.toml",
        content: DEFAULT_MOVE_TOML,
        isDirty: false,
    });
    files.set("sources/main.move", {
        path: "sources/main.move",
        content: DEFAULT_MAIN_MOVE,
        isDirty: false,
    });
    return files;
};

export const useWorkspaceStore = create<WorkspaceState>()(
    immer((set) => ({
        // Initial state
        files: createDefaultFiles(),
        activeFile: "sources/main.move",
        openTabs: ["sources/main.move", "Move.toml"],

        namedAddresses: { playground: "0x1" },
        selectedFunction: "playground::main::hello",
        availableFunctions: [],

        output: [],
        errors: [],
        isExecuting: false,

        wsStatus: "disconnected",

        gistId: null,

        // Actions
        createFile: (path, content = "") =>
            set((state) => {
                state.files.set(path, { path, content, isDirty: true });
                state.openTabs.push(path);
                state.activeFile = path;
            }),

        deleteFile: (path) =>
            set((state) => {
                state.files.delete(path);
                state.openTabs = state.openTabs.filter((t) => t !== path);
                if (state.activeFile === path) {
                    state.activeFile = state.openTabs[0] ?? null;
                }
            }),

        renameFile: (oldPath, newPath) =>
            set((state) => {
                const file = state.files.get(oldPath);
                if (file) {
                    state.files.delete(oldPath);
                    state.files.set(newPath, {
                        ...file,
                        path: newPath,
                        isDirty: true,
                    });
                    state.openTabs = state.openTabs.map((t) =>
                        t === oldPath ? newPath : t,
                    );
                    if (state.activeFile === oldPath) {
                        state.activeFile = newPath;
                    }
                }
            }),

        updateFileContent: (path, content) =>
            set((state) => {
                const file = state.files.get(path);
                if (file) {
                    file.content = content;
                    file.isDirty = true;
                }
            }),

        setActiveFile: (path) =>
            set((state) => {
                state.activeFile = path;
            }),

        openTab: (path) =>
            set((state) => {
                if (!state.openTabs.includes(path)) {
                    state.openTabs.push(path);
                }
                state.activeFile = path;
            }),

        closeTab: (path) =>
            set((state) => {
                const idx = state.openTabs.indexOf(path);
                state.openTabs = state.openTabs.filter((t) => t !== path);
                if (state.activeFile === path) {
                    state.activeFile =
                        state.openTabs[Math.max(0, idx - 1)] ?? null;
                }
            }),

        setNamedAddresses: (addresses) =>
            set((state) => {
                state.namedAddresses = addresses;
            }),

        setSelectedFunction: (func) =>
            set((state) => {
                state.selectedFunction = func;
            }),

        setAvailableFunctions: (funcs) =>
            set((state) => {
                state.availableFunctions = funcs;
            }),

        addOutput: (line) =>
            set((state) => {
                state.output.push(line);
            }),

        clearOutput: () =>
            set((state) => {
                state.output = [];
                state.errors = [];
            }),

        setErrors: (errors) =>
            set((state) => {
                state.errors = errors;
            }),

        setIsExecuting: (executing) =>
            set((state) => {
                state.isExecuting = executing;
            }),

        setWsStatus: (status) =>
            set((state) => {
                state.wsStatus = status;
            }),

        setGistId: (id) =>
            set((state) => {
                state.gistId = id;
            }),

        loadTemplate: () =>
            set((state) => {
                // Reset to default files for now
                state.files = createDefaultFiles();
                state.activeFile = "sources/main.move";
                state.openTabs = ["sources/main.move", "Move.toml"];
                state.output = [];
                state.errors = [];
            }),

        reset: () =>
            set((state) => {
                state.files = createDefaultFiles();
                state.activeFile = "sources/main.move";
                state.openTabs = ["sources/main.move", "Move.toml"];
                state.namedAddresses = { playground: "0x1" };
                state.selectedFunction = "playground::main::hello";
                state.availableFunctions = [];
                state.output = [];
                state.errors = [];
                state.isExecuting = false;
                state.gistId = null;
            }),
    })),
);
