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
    moveFolder: (oldDir: string, newDir: string) => void;
    updateFileContent: (path: string, content: string) => void;
    setActiveFile: (path: string | null) => void;
    openTab: (path: string) => void;
    closeTab: (path: string) => void;
    moveTab: (fromPath: string, toPath: string) => void;

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
    loadWorkspace: (
        files: FileContent[],
        namedAddresses: Record<string, string>,
    ) => void;
    deleteFolder: (dir: string) => void;
    reset: () => void;
}

const DEFAULT_MOVE_TOML = `[package]
name = "playground"
version = "0.0.1"

[addresses]
playground = "_"

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-framework.git"
subdir = "aptos-framework"
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

        moveFolder: (oldDir, newDir) =>
            set((state) => {
                const prefix = `${oldDir}/`;
                const entries = Array.from(state.files.entries()).filter(
                    ([path]) => path.startsWith(prefix),
                );
                if (entries.length === 0) {
                    return;
                }

                for (const [path, file] of entries) {
                    const suffix = path.slice(prefix.length);
                    const nextPath = `${newDir}/${suffix}`;
                    state.files.delete(path);
                    state.files.set(nextPath, {
                        ...file,
                        path: nextPath,
                        isDirty: true,
                    });
                }

                state.openTabs = state.openTabs.map((tab) => {
                    if (tab.startsWith(prefix)) {
                        const suffix = tab.slice(prefix.length);
                        return `${newDir}/${suffix}`;
                    }
                    return tab;
                });
                if (state.activeFile?.startsWith(prefix)) {
                    const suffix = state.activeFile.slice(prefix.length);
                    state.activeFile = `${newDir}/${suffix}`;
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
        moveTab: (fromPath, toPath) =>
            set((state) => {
                const fromIndex = state.openTabs.indexOf(fromPath);
                const toIndex = state.openTabs.indexOf(toPath);
                if (fromIndex === -1 || toIndex === -1) return;
                if (fromIndex === toIndex) return;
                const nextTabs = [...state.openTabs];
                const [moved] = nextTabs.splice(fromIndex, 1);
                nextTabs.splice(toIndex, 0, moved);
                state.openTabs = nextTabs;
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

        loadWorkspace: (filesList, namedAddresses) =>
            set((state) => {
                const files = new Map<string, FileContent>();
                for (const file of filesList) {
                    files.set(file.path, { ...file, isDirty: false });
                }
                state.files = files;
                state.openTabs = Array.from(files.keys());
                state.activeFile = state.openTabs[0] ?? null;
                state.namedAddresses = namedAddresses;
                state.selectedFunction = null;
                state.availableFunctions = [];
                state.output = [];
                state.errors = [];
                state.gistId = null;
            }),

        deleteFolder: (dir) =>
            set((state) => {
                const prefix = `${dir}/`;
                const targets = Array.from(state.files.keys()).filter((path) =>
                    path.startsWith(prefix),
                );
                if (targets.length === 0) {
                    return;
                }

                for (const path of targets) {
                    state.files.delete(path);
                }
                state.openTabs = state.openTabs.filter(
                    (tab) => !tab.startsWith(prefix),
                );
                if (state.activeFile?.startsWith(prefix)) {
                    state.activeFile = state.openTabs[0] ?? null;
                }
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
