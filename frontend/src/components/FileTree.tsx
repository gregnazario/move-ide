import { FileText, FolderOpen, Plus } from "lucide-react";
import { useWorkspaceStore } from "../store";

export function FileTree() {
    const { files, activeFile, openTab } = useWorkspaceStore();

    // Group files by directory
    const fileList = Array.from(files.values());
    const directories: Map<string, typeof fileList> = new Map();
    const rootFiles: typeof fileList = [];

    for (const file of fileList) {
        const parts = file.path.split("/");
        if (parts.length > 1) {
            const dir = parts[0];
            if (!directories.has(dir)) {
                directories.set(dir, []);
            }
            const dirFiles = directories.get(dir);
            if (dirFiles) {
                dirFiles.push(file);
            }
        } else {
            rootFiles.push(file);
        }
    }

    return (
        <div className="h-full bg-bg-secondary flex flex-col">
            {/* Header */}
            <div className="h-10 px-3 flex items-center justify-between border-b border-border">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Explorer
                </span>
                <button
                    type="button"
                    className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                >
                    <Plus size={14} className="text-text-secondary" />
                </button>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto py-2">
                {/* Directories */}
                {Array.from(directories.entries()).map(([dir, dirFiles]) => (
                    <div key={dir}>
                        <div className="flex items-center gap-1.5 px-3 py-1 text-text-secondary">
                            <FolderOpen size={14} />
                            <span className="text-sm">{dir}</span>
                        </div>
                        {dirFiles.map((file) => (
                            <button
                                type="button"
                                key={file.path}
                                onClick={() => openTab(file.path)}
                                className={`w-full flex items-center gap-1.5 pl-6 pr-3 py-1 text-left hover:bg-bg-tertiary transition-colors ${
                                    activeFile === file.path
                                        ? "bg-bg-tertiary text-text-primary"
                                        : "text-text-secondary"
                                }`}
                            >
                                <FileText size={14} />
                                <span className="text-sm truncate">
                                    {file.isDirty && (
                                        <span className="text-text-link">
                                            •{" "}
                                        </span>
                                    )}
                                    {file.path.split("/").pop()}
                                </span>
                            </button>
                        ))}
                    </div>
                ))}

                {/* Root Files */}
                {rootFiles.map((file) => (
                    <button
                        type="button"
                        key={file.path}
                        onClick={() => openTab(file.path)}
                        className={`w-full flex items-center gap-1.5 px-3 py-1 text-left hover:bg-bg-tertiary transition-colors ${
                            activeFile === file.path
                                ? "bg-bg-tertiary text-text-primary"
                                : "text-text-secondary"
                        }`}
                    >
                        <FileText size={14} />
                        <span className="text-sm truncate">
                            {file.isDirty && (
                                <span className="text-text-link">• </span>
                            )}
                            {file.path}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
