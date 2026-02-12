import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { X } from "lucide-react";
import type { editor } from "monaco-editor";
import { initVimMode } from "monaco-vim";
import { useEffect, useRef } from "react";
import { moveLanguageConfig } from "../lib/moveLanguage";
import {
    tomlLanguageConfig,
    tomlLanguageConfiguration,
} from "../lib/tomlLanguage";
import { type Theme, useUiStore, useWorkspaceStore } from "../store";

let hasRegisteredLanguages = false;
let hasDefinedTheme = false;

const getEditorTheme = (currentTheme: Theme) =>
    currentTheme === "dark" ? "move-ide-dark" : "move-ide-light";

export function EditorPane() {
    const { theme, keybindingMode } = useUiStore();
    const {
        files,
        activeFile,
        openTabs,
        setActiveFile,
        closeTab,
        moveTab,
        updateFileContent,
        errors,
    } = useWorkspaceStore();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const vimModeRef = useRef<{ dispose: () => void } | null>(null);
    const vimStatusRef = useRef<HTMLDivElement | null>(null);

    const activeFileContent = activeFile ? files.get(activeFile)?.content : "";

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        if (!hasDefinedTheme) {
            hasDefinedTheme = true;
            monaco.editor.defineTheme("move-ide-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [
                    // Keywords: control flow, declarations
                    { token: "keyword", foreground: "ff7b72" },
                    // Primitive types (u64, bool, address, …)
                    { token: "type", foreground: "7ee787" },
                    // PascalCase type references
                    { token: "type.identifier", foreground: "7ee787" },
                    // Function names after `fun`
                    {
                        token: "entity.name.function",
                        foreground: "d2a8ff",
                        fontStyle: "bold",
                    },
                    // Struct / enum names after `struct` / `enum`
                    {
                        token: "entity.name.type",
                        foreground: "7ee787",
                        fontStyle: "bold",
                    },
                    // Function / method invocations
                    {
                        token: "entity.name.function.invoke",
                        foreground: "d2a8ff",
                    },
                    // Macro invocations & global storage builtins
                    { token: "support.function", foreground: "d2a8ff" },
                    // Ability names after `has` (copy, drop, store, key)
                    {
                        token: "support.type",
                        foreground: "7ee787",
                        fontStyle: "italic",
                    },
                    // Numeric literals
                    { token: "number", foreground: "79c0ff" },
                    { token: "number.hex", foreground: "79c0ff" },
                    // Strings
                    { token: "string", foreground: "a5d6ff" },
                    { token: "string.quote", foreground: "a5d6ff" },
                    { token: "string.escape", foreground: "79c0ff" },
                    // Comments
                    { token: "comment", foreground: "8b949e" },
                    // Doc comments (///)
                    {
                        token: "comment.doc",
                        foreground: "8b949e",
                        fontStyle: "italic",
                    },
                    // Attributes (#[…])
                    { token: "annotation", foreground: "d2a8ff" },
                    // Constants (MAX_U64, true/false, @named_addr)
                    { token: "constant", foreground: "ffa657" },
                    // Lambda / closure parameters
                    { token: "variable.parameter", foreground: "e3b341" },
                    // self keyword
                    {
                        token: "variable.predefined",
                        foreground: "ffa657",
                        fontStyle: "italic",
                    },
                    // Loop labels ('outer)
                    { token: "tag", foreground: "7ee787" },
                    // Delimiters (;  ,  .)
                    { token: "delimiter", foreground: "8b949e" },
                    // Operators (::  +  ==  …)
                    { token: "operator", foreground: "ff7b72" },
                ],
                colors: {
                    "editor.foreground": "#e6edf3",
                    "editor.background": "#0d1117",
                    "editorLineNumber.foreground": "#30363d",
                    "editorLineNumber.activeForeground": "#8b949e",
                },
            });

            monaco.editor.defineTheme("move-ide-light", {
                base: "vs",
                inherit: true,
                rules: [
                    { token: "keyword", foreground: "cf222e" },
                    { token: "type", foreground: "116329" },
                    { token: "type.identifier", foreground: "116329" },
                    {
                        token: "entity.name.function",
                        foreground: "8250df",
                        fontStyle: "bold",
                    },
                    {
                        token: "entity.name.type",
                        foreground: "116329",
                        fontStyle: "bold",
                    },
                    {
                        token: "entity.name.function.invoke",
                        foreground: "8250df",
                    },
                    { token: "support.function", foreground: "8250df" },
                    {
                        token: "support.type",
                        foreground: "116329",
                        fontStyle: "italic",
                    },
                    { token: "number", foreground: "0550ae" },
                    { token: "number.hex", foreground: "0550ae" },
                    { token: "string", foreground: "0a3069" },
                    { token: "string.quote", foreground: "0a3069" },
                    { token: "string.escape", foreground: "0550ae" },
                    { token: "comment", foreground: "6e7781" },
                    {
                        token: "comment.doc",
                        foreground: "6e7781",
                        fontStyle: "italic",
                    },
                    { token: "annotation", foreground: "8250df" },
                    { token: "constant", foreground: "953800" },
                    { token: "variable.parameter", foreground: "953800" },
                    {
                        token: "variable.predefined",
                        foreground: "953800",
                        fontStyle: "italic",
                    },
                    { token: "tag", foreground: "116329" },
                    { token: "delimiter", foreground: "57606a" },
                    { token: "operator", foreground: "cf222e" },
                ],
                colors: {
                    "editor.foreground": "#24292f",
                    "editor.background": "#f6f8fa",
                    "editorLineNumber.foreground": "#d0d7de",
                    "editorLineNumber.activeForeground": "#57606a",
                },
            });
        }

        if (!hasRegisteredLanguages) {
            hasRegisteredLanguages = true;
            // Register Move language
            monaco.languages.register({ id: "move" });
            try {
                monaco.languages.setMonarchTokensProvider(
                    "move",
                    moveLanguageConfig,
                );
            } catch (err) {
                console.warn("Failed to register Move language tokens", err);
            }
            monaco.languages.setLanguageConfiguration("move", {
                comments: {
                    lineComment: "//",
                    blockComment: ["/*", "*/"],
                },
                brackets: [
                    ["{", "}"],
                    ["[", "]"],
                    ["(", ")"],
                    ["<", ">"],
                ],
                autoClosingPairs: [
                    { open: "{", close: "}" },
                    { open: "[", close: "]" },
                    { open: "(", close: ")" },
                    { open: "<", close: ">" },
                    { open: '"', close: '"' },
                ],
            });

            // Register TOML language
            monaco.languages.register({ id: "toml" });
            monaco.languages.setMonarchTokensProvider(
                "toml",
                tomlLanguageConfig,
            );
            monaco.languages.setLanguageConfiguration(
                "toml",
                tomlLanguageConfiguration,
            );
        }

        monaco.editor.setTheme(getEditorTheme(theme));

        // Keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            // Trigger run - this will be handled by the Header component
            document.dispatchEvent(new CustomEvent("playground:run"));
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // Trigger share
            document.dispatchEvent(new CustomEvent("playground:share"));
        });

        if (keybindingMode === "vim") {
            if (vimModeRef.current) {
                vimModeRef.current.dispose();
                vimModeRef.current = null;
            }
            if (vimStatusRef.current) {
                vimModeRef.current = initVimMode(editor, vimStatusRef.current);
            }
        }
    };

    useEffect(() => {
        if (!monacoRef.current) return;
        monacoRef.current.editor.setTheme(getEditorTheme(theme));
    }, [theme]);

    useEffect(() => {
        if (!editorRef.current) return;
        if (keybindingMode === "vim") {
            if (!vimModeRef.current && vimStatusRef.current) {
                vimModeRef.current = initVimMode(
                    editorRef.current,
                    vimStatusRef.current,
                );
            }
            return;
        }
        if (vimModeRef.current) {
            vimModeRef.current.dispose();
            vimModeRef.current = null;
        }
        if (vimStatusRef.current) {
            vimStatusRef.current.textContent = "";
        }
    }, [keybindingMode]);

    useEffect(() => {
        return () => {
            if (vimModeRef.current) {
                vimModeRef.current.dispose();
                vimModeRef.current = null;
            }
        };
    }, []);

    // Update error markers when errors change
    useEffect(() => {
        if (!monacoRef.current || !editorRef.current) return;

        const monaco = monacoRef.current;
        const models: editor.ITextModel[] = monaco.editor.getModels();

        // Clear all markers first
        for (const model of models) {
            monaco.editor.setModelMarkers(model, "move-compiler", []);
        }

        // Set new markers
        for (const error of errors) {
            const model = models.find((entry: editor.ITextModel) =>
                entry.uri.path.endsWith(error.file),
            );
            if (model) {
                const markers = monaco.editor.getModelMarkers({
                    resource: model.uri,
                });
                monaco.editor.setModelMarkers(model, "move-compiler", [
                    ...markers,
                    {
                        severity:
                            error.severity === "error"
                                ? monaco.MarkerSeverity.Error
                                : error.severity === "warning"
                                  ? monaco.MarkerSeverity.Warning
                                  : monaco.MarkerSeverity.Info,
                        message: error.message,
                        startLineNumber: error.line,
                        startColumn: error.column,
                        endLineNumber: error.endLine ?? error.line,
                        endColumn: error.endColumn ?? error.column + 1,
                    },
                ]);
            }
        }
    }, [errors]);

    const getLanguage = (path: string) => {
        if (path.endsWith(".move")) return "move";
        if (path.endsWith(".toml")) return "toml";
        return "plaintext";
    };

    return (
        <div className="h-full flex flex-col bg-bg-primary">
            {/* Tab Bar */}
            <div className="h-9 flex items-center bg-bg-secondary border-b border-border overflow-x-auto">
                {openTabs.map((tab) => {
                    const file = files.get(tab);
                    const isActive = activeFile === tab;
                    return (
                        <div
                            key={tab}
                            className={`flex items-center h-full border-r border-border group ${
                                isActive
                                    ? "bg-bg-primary text-text-primary border-b-2 border-b-text-link"
                                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                            } cursor-grab active:cursor-grabbing`}
                            draggable
                            onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", tab);
                                event.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                const fromTab =
                                    event.dataTransfer.getData("text/plain");
                                if (!fromTab) return;
                                moveTab(fromTab, tab);
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setActiveFile(tab)}
                                className="flex items-center gap-2 px-3 h-full text-left"
                            >
                                <span className="text-xs whitespace-nowrap">
                                    {file?.isDirty && (
                                        <span className="text-text-link">
                                            •{" "}
                                        </span>
                                    )}
                                    {tab.split("/").pop()}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab);
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:bg-bg-tertiary rounded p-0.5 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Editor */}
            <div className="flex-1">
                {activeFile ? (
                    <Editor
                        height="100%"
                        language={getLanguage(activeFile)}
                        value={activeFileContent}
                        theme={getEditorTheme(theme)}
                        onChange={(value) => {
                            if (activeFile && value !== undefined) {
                                updateFileContent(activeFile, value);
                            }
                        }}
                        onMount={handleEditorMount}
                        options={{
                            fontSize: 14,
                            fontFamily:
                                "'JetBrains Mono', 'Fira Code', monospace",
                            tabSize: 4,
                            insertSpaces: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            lineNumbers: "on",
                            renderWhitespace: "selection",
                            bracketPairColorization: { enabled: true },
                            padding: { top: 8 },
                        }}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-text-secondary">
                        Select a file to edit
                    </div>
                )}
            </div>
            {keybindingMode === "vim" && (
                <div className="h-7 px-3 flex items-center bg-bg-secondary border-t border-border text-xs text-text-secondary">
                    <div ref={vimStatusRef} />
                </div>
            )}
        </div>
    );
}
