import {
    FileText,
    FolderOpen,
    FolderPlus,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { validateFilePath, validateFolderPath } from "../lib/pathRules";
import { useWorkspaceStore } from "../store";

type TreeNode = {
    type: "folder" | "file";
    name: string;
    path: string;
    children?: Map<string, TreeNode>;
};

type EditState =
    | { mode: "create-file" }
    | { mode: "create-folder" }
    | { mode: "rename-file"; path: string }
    | { mode: "rename-folder"; path: string };

const ROOT_PATH = "";

const isMoveToml = (path: string) => path === "Move.toml";

const getBaseName = (path: string) =>
    path.split("/").filter(Boolean).pop() ?? path;

const isDescendant = (parent: string, child: string) =>
    child === parent || child.startsWith(`${parent}/`);

const sortNodes = (
    nodes: TreeNode[],
    parentPath: string,
    getOrderedFileNames: (dir: string, fileNames: string[]) => string[],
) => {
    const folders = nodes
        .filter((node) => node.type === "folder")
        .sort((a, b) => a.name.localeCompare(b.name));
    const files = nodes.filter((node) => node.type === "file");
    const fileNames = files.map((node) => node.name);
    const orderedNames = getOrderedFileNames(parentPath, fileNames);
    const fileMap = new Map(files.map((node) => [node.name, node]));
    const orderedFiles = orderedNames
        .map((name) => fileMap.get(name))
        .filter((node): node is TreeNode => Boolean(node));
    return [...folders, ...orderedFiles];
};

export function FileTree() {
    const {
        files,
        activeFile,
        openTab,
        createFile,
        renameFile,
        deleteFile,
        moveFolder,
        deleteFolder,
    } = useWorkspaceStore();

    const [editState, setEditState] = useState<EditState | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [dragOverPath, setDragOverPath] = useState<string | null>(null);
    const [virtualFolders, setVirtualFolders] = useState<string[]>([]);
    const [fileOrderByDir, setFileOrderByDir] = useState<
        Record<string, string[]>
    >({});
    const [confirmState, setConfirmState] = useState<
        { type: "file"; path: string } | { type: "folder"; path: string } | null
    >(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const editInputRef = useRef<HTMLInputElement | null>(null);

    const filePaths = useMemo(() => Array.from(files.keys()), [files]);

    const getParentDir = (path: string) =>
        path.split("/").slice(0, -1).join("/");

    const getOrderedFileNames = (dir: string, fileNames: string[]) => {
        const stored = fileOrderByDir[dir] ?? [];
        const kept = stored.filter((name) => fileNames.includes(name));
        const remaining = fileNames
            .filter((name) => !stored.includes(name))
            .sort((a, b) => a.localeCompare(b));
        return [...kept, ...remaining];
    };

    const { rootNode, folderSet } = useMemo(() => {
        const root: TreeNode = {
            type: "folder",
            name: "",
            path: ROOT_PATH,
            children: new Map(),
        };
        const folders = new Set<string>();

        const ensureFolderPath = (path: string) => {
            if (!path) return;
            const segments = path.split("/").filter(Boolean);
            let current = root;
            let currentPath = "";
            for (const segment of segments) {
                currentPath = currentPath
                    ? `${currentPath}/${segment}`
                    : segment;
                if (!current.children?.has(segment)) {
                    const node: TreeNode = {
                        type: "folder",
                        name: segment,
                        path: currentPath,
                        children: new Map(),
                    };
                    current.children?.set(segment, node);
                }
                current = current.children?.get(segment) as TreeNode;
                folders.add(currentPath);
            }
        };

        const addFilePath = (path: string) => {
            const segments = path.split("/").filter(Boolean);
            if (segments.length === 0) return;
            const fileName = segments[segments.length - 1];
            const dirPath = segments.slice(0, -1).join("/");
            ensureFolderPath(dirPath);
            const parent =
                dirPath === ""
                    ? root
                    : (dirPath
                          .split("/")
                          .filter(Boolean)
                          .reduce<TreeNode>((node, segment) => {
                              return node.children?.get(segment) as TreeNode;
                          }, root) as TreeNode);
            parent.children?.set(fileName, {
                type: "file",
                name: fileName,
                path,
            });
        };

        for (const path of filePaths) {
            addFilePath(path);
        }

        for (const folderPath of virtualFolders) {
            ensureFolderPath(folderPath);
        }

        return { rootNode: root, folderSet: folders };
    }, [filePaths, virtualFolders]);

    const resetEdit = () => {
        setEditState(null);
        setEditValue("");
    };

    const fileExists = (path: string) => files.has(path);
    const folderExists = (path: string) => folderSet.has(path);

    const startCreateFile = () => {
        setEditState({ mode: "create-file" });
        setEditValue("");
        setShowMenu(false);
    };

    const startCreateFolder = () => {
        setEditState({ mode: "create-folder" });
        setEditValue("");
        setShowMenu(false);
    };

    useEffect(() => {
        if (!showMenu) return;
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (
                menuRef.current &&
                target &&
                !menuRef.current.contains(target)
            ) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showMenu]);

    useEffect(() => {
        if (!confirmState) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setConfirmState(null);
            }
            if (event.key === "Enter") {
                confirmDelete();
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [confirmState]);

    useEffect(() => {
        if (!editState) return;
        if (editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editState]);

    const startRenameFile = (path: string) => {
        setEditState({ mode: "rename-file", path });
        setEditValue(path);
    };

    const startRenameFolder = (path: string) => {
        setEditState({ mode: "rename-folder", path });
        setEditValue(path);
    };

    const commitEdit = () => {
        if (!editState) return;
        const value = editValue.trim();

        if (editState.mode === "create-file") {
            const result = validateFilePath(value);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }
            if (fileExists(result.normalized)) {
                toast.error("A file with that path already exists");
                return;
            }
            if (folderExists(result.normalized)) {
                toast.error("A folder with that path already exists");
                return;
            }
            createFile(result.normalized, "");
            resetEdit();
            return;
        }

        if (editState.mode === "create-folder") {
            const result = validateFolderPath(value);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }
            if (fileExists(result.normalized)) {
                toast.error("A file with that path already exists");
                return;
            }
            if (folderExists(result.normalized)) {
                toast.error("A folder with that path already exists");
                return;
            }
            setVirtualFolders((prev) => [...prev, result.normalized]);
            resetEdit();
            return;
        }

        if (editState.mode === "rename-file") {
            const oldPath = editState.path;
            if (isMoveToml(oldPath)) {
                toast.error("Move.toml cannot be renamed");
                return;
            }
            const result = validateFilePath(value);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }
            if (result.normalized === oldPath) {
                resetEdit();
                return;
            }
            if (fileExists(result.normalized)) {
                toast.error("A file with that path already exists");
                return;
            }
            if (folderExists(result.normalized)) {
                toast.error("A folder with that path already exists");
                return;
            }
            renameFile(oldPath, result.normalized);
            resetEdit();
            return;
        }

        if (editState.mode === "rename-folder") {
            const oldDir = editState.path;
            const result = validateFolderPath(value);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }
            const newDir = result.normalized;
            if (newDir === oldDir) {
                resetEdit();
                return;
            }
            if (fileExists(newDir) || folderExists(newDir)) {
                toast.error("A file or folder with that path already exists");
                return;
            }
            if (isDescendant(oldDir, newDir)) {
                toast.error("A folder cannot be moved into itself");
                return;
            }

            const affectedFiles = filePaths.filter((path) =>
                path.startsWith(`${oldDir}/`),
            );
            if (affectedFiles.length > 0) {
                const conflicts = affectedFiles.some((path) => {
                    const nextPath = `${newDir}/${path.slice(
                        oldDir.length + 1,
                    )}`;
                    return fileExists(nextPath);
                });
                if (conflicts) {
                    toast.error("That move would overwrite existing files");
                    return;
                }
                moveFolder(oldDir, newDir);
            }

            setVirtualFolders((prev) => {
                const next = new Set<string>();
                let replaced = false;
                for (const folder of prev) {
                    if (isDescendant(oldDir, folder)) {
                        const suffix = folder.slice(oldDir.length);
                        const mapped = `${newDir}${suffix}`;
                        next.add(mapped);
                        replaced = true;
                    } else {
                        next.add(folder);
                    }
                }
                if (!replaced) {
                    next.add(newDir);
                }
                return Array.from(next);
            });
            resetEdit();
        }
    };

    const handleDeleteFile = (path: string) => {
        if (isMoveToml(path)) {
            toast.error("Move.toml cannot be deleted");
            return;
        }
        setConfirmState({ type: "file", path });
    };

    const handleDeleteFolder = (dir: string) => {
        setConfirmState({ type: "folder", path: dir });
    };

    const confirmDelete = () => {
        if (!confirmState) return;
        if (confirmState.type === "file") {
            deleteFile(confirmState.path);
        } else {
            const dir = confirmState.path;
            const affectedFiles = filePaths.filter((path) =>
                path.startsWith(`${dir}/`),
            );
            if (affectedFiles.length > 0) {
                deleteFolder(dir);
            }
            setVirtualFolders((prev) =>
                prev.filter((folder) => !isDescendant(dir, folder)),
            );
        }
        setConfirmState(null);
    };

    const handleDragStart = (
        event: DragEvent,
        payload: { type: "file" | "folder"; path: string },
    ) => {
        event.dataTransfer.setData("application/json", JSON.stringify(payload));
        event.dataTransfer.setData("text/plain", payload.path);
        event.dataTransfer.effectAllowed = "move";
    };

    const parseDragData = (event: DragEvent) => {
        const raw = event.dataTransfer.getData("application/json");
        if (!raw) return null;
        try {
            return JSON.parse(raw) as { type: "file" | "folder"; path: string };
        } catch {
            return null;
        }
    };

    const canDropOnFolder = (
        payload: { type: "file" | "folder"; path: string },
        targetDir: string,
    ) => {
        if (payload.type === "file") {
            return true;
        }
        if (payload.path === targetDir) {
            return false;
        }
        if (targetDir && isDescendant(payload.path, targetDir)) {
            return false;
        }
        return true;
    };

    const handleDrop = (event: DragEvent, targetDir: string) => {
        event.preventDefault();
        const payload = parseDragData(event);
        setDragOverPath(null);
        if (!payload) return;
        if (!canDropOnFolder(payload, targetDir)) {
            toast.error("Cannot move a folder into itself");
            return;
        }

        if (payload.type === "file") {
            if (isMoveToml(payload.path)) {
                toast.error("Move.toml cannot be moved");
                return;
            }
            const base = getBaseName(payload.path);
            const destination = targetDir ? `${targetDir}/${base}` : base;
            if (destination === payload.path) {
                return;
            }
            if (fileExists(destination)) {
                toast.error("A file with that path already exists");
                return;
            }
            if (folderExists(destination)) {
                toast.error("A folder with that path already exists");
                return;
            }
            renameFile(payload.path, destination);
            return;
        }

        const base = getBaseName(payload.path);
        const newDir = targetDir ? `${targetDir}/${base}` : base;
        if (newDir === payload.path) {
            return;
        }
        if (fileExists(newDir) || folderExists(newDir)) {
            toast.error("A file or folder with that path already exists");
            return;
        }
        if (isDescendant(payload.path, newDir)) {
            toast.error("Cannot move a folder into itself");
            return;
        }

        const movingFiles = filePaths.filter((path) =>
            path.startsWith(`${payload.path}/`),
        );
        const movingSet = new Set(movingFiles);
        const conflict = movingFiles.some((path) => {
            const nextPath = `${newDir}/${path.slice(payload.path.length + 1)}`;
            return fileExists(nextPath) && !movingSet.has(nextPath);
        });
        if (conflict) {
            toast.error("That move would overwrite existing files");
            return;
        }
        if (movingFiles.length > 0) {
            moveFolder(payload.path, newDir);
        }

        setVirtualFolders((prev) => {
            const next = new Set<string>();
            let replaced = false;
            for (const folder of prev) {
                if (isDescendant(payload.path, folder)) {
                    const suffix = folder.slice(payload.path.length);
                    const mapped = `${newDir}${suffix}`;
                    next.add(mapped);
                    replaced = true;
                } else {
                    next.add(folder);
                }
            }
            if (!replaced) {
                next.add(newDir);
            }
            return Array.from(next);
        });
    };

    const renderInputRow = () => {
        if (!editState) return null;
        if (
            editState.mode !== "create-file" &&
            editState.mode !== "create-folder"
        ) {
            return null;
        }
        const label =
            editState.mode === "create-file" ? "New File" : "New Folder";
        return (
            <div className="px-3 py-1">
                <div className="flex items-center gap-2 text-text-secondary">
                    {editState.mode === "create-file" ? (
                        <FileText size={14} />
                    ) : (
                        <FolderPlus size={14} />
                    )}
                    <input
                        type="text"
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                commitEdit();
                            }
                            if (event.key === "Escape") {
                                resetEdit();
                            }
                        }}
                        onBlur={() => resetEdit()}
                        ref={editInputRef}
                        placeholder={`${label} path`}
                        className="flex-1 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-text-link"
                    />
                </div>
            </div>
        );
    };

    const renderFolderRow = (node: TreeNode, depth: number) => {
        const isRenaming =
            editState?.mode === "rename-folder" && editState.path === node.path;

        const paddingLeft = 12 + depth * 16;

        return (
            <div key={node.path}>
                <div
                    className={`group flex items-center gap-2 py-1 pr-2 ${
                        dragOverPath === node.path
                            ? "bg-bg-tertiary"
                            : "hover:bg-bg-tertiary"
                    }`}
                    style={{ paddingLeft }}
                    onDragOver={(event) => {
                        const payload = parseDragData(event);
                        if (!payload || !canDropOnFolder(payload, node.path)) {
                            return;
                        }
                        event.preventDefault();
                        setDragOverPath(node.path);
                    }}
                    onDragLeave={() => setDragOverPath(null)}
                    onDrop={(event) => handleDrop(event, node.path)}
                >
                    <div
                        className="flex items-center gap-2 flex-1 min-w-0"
                        draggable
                        onDragStart={(event) =>
                            handleDragStart(event, {
                                type: "folder",
                                path: node.path,
                            })
                        }
                    >
                        <FolderOpen size={14} className="text-text-secondary" />
                        {isRenaming ? (
                            <input
                                type="text"
                                value={editValue}
                                onChange={(event) =>
                                    setEditValue(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        commitEdit();
                                    }
                                    if (event.key === "Escape") {
                                        resetEdit();
                                    }
                                }}
                                onBlur={() => resetEdit()}
                                ref={editInputRef}
                                className="flex-1 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-text-link"
                            />
                        ) : (
                            <span className="text-sm text-text-secondary truncate">
                                {node.name}
                            </span>
                        )}
                    </div>
                    {!isRenaming && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={() => startRenameFolder(node.path)}
                                className="p-1 hover:bg-bg-tertiary rounded"
                            >
                                <Pencil size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteFolder(node.path)}
                                className="p-1 hover:bg-bg-tertiary rounded text-red-400"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                </div>
                {node.children &&
                    renderChildren(node.children, depth + 1, node.path)}
            </div>
        );
    };

    const renderFileRow = (node: TreeNode, depth: number) => {
        const isRenaming =
            editState?.mode === "rename-file" && editState.path === node.path;
        const paddingLeft = 12 + depth * 16;
        const isProtected = isMoveToml(node.path);
        const parentDir = getParentDir(node.path);

        return (
            <div
                key={node.path}
                className={`group flex items-center gap-2 py-1 pr-2 ${
                    activeFile === node.path
                        ? "bg-bg-tertiary text-text-primary"
                        : "text-text-secondary hover:bg-bg-tertiary"
                }`}
                style={{ paddingLeft }}
                onDragOver={(event) => {
                    const payload = parseDragData(event);
                    if (!payload || payload.type !== "file") {
                        return;
                    }
                    if (getParentDir(payload.path) !== parentDir) {
                        return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                    const payload = parseDragData(event);
                    if (!payload || payload.type !== "file") {
                        return;
                    }
                    if (getParentDir(payload.path) !== parentDir) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    if (payload.path === node.path) return;
                    const fileNames = filePaths
                        .filter((path) => getParentDir(path) === parentDir)
                        .map(getBaseName);
                    const ordered = getOrderedFileNames(parentDir, fileNames);
                    const fromName = getBaseName(payload.path);
                    const toName = getBaseName(node.path);
                    const fromIndex = ordered.indexOf(fromName);
                    const toIndex = ordered.indexOf(toName);
                    if (fromIndex === -1 || toIndex === -1) return;
                    const next = [...ordered];
                    next.splice(fromIndex, 1);
                    next.splice(toIndex, 0, fromName);
                    setFileOrderByDir((prev) => ({
                        ...prev,
                        [parentDir]: next,
                    }));
                }}
            >
                <button
                    type="button"
                    onClick={() => openTab(node.path)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    draggable={!isProtected}
                    onDragStart={(event) =>
                        !isProtected &&
                        handleDragStart(event, {
                            type: "file",
                            path: node.path,
                        })
                    }
                >
                    <FileText size={14} />
                    {isRenaming ? (
                        <input
                            type="text"
                            value={editValue}
                            onChange={(event) =>
                                setEditValue(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    commitEdit();
                                }
                                if (event.key === "Escape") {
                                    resetEdit();
                                }
                            }}
                            onBlur={() => resetEdit()}
                            ref={editInputRef}
                            className="flex-1 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-text-link"
                        />
                    ) : (
                        <span className="text-sm truncate">{node.name}</span>
                    )}
                </button>
                {!isRenaming && !isProtected && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={() => startRenameFile(node.path)}
                            className="p-1 hover:bg-bg-tertiary rounded"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteFile(node.path)}
                            className="p-1 hover:bg-bg-tertiary rounded text-red-400"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderChildren = (
        children: Map<string, TreeNode>,
        depth: number,
        parentPath: string,
    ) => {
        const nodes = sortNodes(
            Array.from(children.values()),
            parentPath,
            getOrderedFileNames,
        );
        return nodes.map((node) =>
            node.type === "folder"
                ? renderFolderRow(node, depth)
                : renderFileRow(node, depth),
        );
    };

    return (
        <div className="h-full bg-bg-secondary flex flex-col">
            <div className="h-10 px-3 flex items-center justify-between border-b border-border relative">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Explorer
                </span>
                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setShowMenu((prev) => !prev)}
                        className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                    >
                        <Plus size={14} className="text-text-secondary" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-36 bg-bg-tertiary border border-border rounded shadow-lg z-10">
                            <button
                                type="button"
                                onClick={startCreateFile}
                                className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-secondary"
                            >
                                New File
                            </button>
                            <button
                                type="button"
                                onClick={startCreateFolder}
                                className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-secondary"
                            >
                                New Folder
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`flex-1 overflow-y-auto py-2 ${
                    dragOverPath === ROOT_PATH ? "bg-bg-tertiary" : ""
                }`}
                onDragOver={(event) => {
                    const payload = parseDragData(event);
                    if (!payload || !canDropOnFolder(payload, ROOT_PATH)) {
                        return;
                    }
                    event.preventDefault();
                    setDragOverPath(ROOT_PATH);
                }}
                onDragLeave={() => setDragOverPath(null)}
                onDrop={(event) => handleDrop(event, ROOT_PATH)}
            >
                {renderInputRow()}
                {rootNode.children &&
                    renderChildren(rootNode.children, 0, ROOT_PATH)}
            </div>

            {confirmState && (
                <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center z-20"
                    onMouseDown={() => setConfirmState(null)}
                >
                    <div
                        className="w-80 bg-bg-secondary border border-border rounded shadow-xl p-4"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="text-sm text-text-primary font-medium">
                            {confirmState.type === "file"
                                ? "Delete file?"
                                : "Delete folder?"}
                        </div>
                        <div className="mt-2 text-xs text-text-secondary">
                            {confirmState.type === "file"
                                ? `This will remove ${confirmState.path}.`
                                : `This will remove ${confirmState.path} and all files inside.`}
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmState(null)}
                                className="px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-tertiary rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
