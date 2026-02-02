import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { X } from "lucide-react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import { moveLanguageConfig } from "../lib/moveLanguage";
import { useWorkspaceStore } from "../store";

export function EditorPane() {
    const {
        files,
        activeFile,
        openTabs,
        setActiveFile,
        closeTab,
        updateFileContent,
        errors,
    } = useWorkspaceStore();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);

    const activeFileContent = activeFile ? files.get(activeFile)?.content : "";

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Register Move language
        monaco.languages.register({ id: "move" });
        monaco.languages.setMonarchTokensProvider("move", moveLanguageConfig);

        // Set up error markers when errors change
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

        // Keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            // Trigger run - this will be handled by the Header component
            document.dispatchEvent(new CustomEvent("playground:run"));
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // Trigger share
            document.dispatchEvent(new CustomEvent("playground:share"));
        });
    };

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
                            }`}
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
                        theme="vs-dark"
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
        </div>
    );
}
