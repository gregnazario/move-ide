import {
    ChevronDown,
    FlaskConical,
    Play,
    Settings,
    Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebSocket } from "../hooks/useWebSocket";
import { useWorkspaceStore } from "../store";

export function Header() {
    const { isExecuting, selectedFunction, wsStatus } = useWorkspaceStore();
    const { execute } = useWebSocket();
    const [showRunMenu, setShowRunMenu] = useState(false);

    const handleRun = async () => {
        if (!selectedFunction) {
            toast.error("Please select an entry function");
            return;
        }
        await execute("run");
    };

    const handleTest = async () => {
        await execute("test");
    };

    const handleShare = async () => {
        const { files, namedAddresses } = useWorkspaceStore.getState();

        const filesArray = Array.from(files.values()).map((f) => ({
            path: f.path,
            content: f.content,
        }));

        try {
            const response = await fetch("/api/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: filesArray, namedAddresses }),
            });

            if (!response.ok) {
                throw new Error("Failed to create share link");
            }

            const data = await response.json();

            // Update URL
            window.history.pushState({}, "", `?id=${data.id}`);
            useWorkspaceStore.getState().setGistId(data.id);

            // Copy to clipboard
            await navigator.clipboard.writeText(data.url);
            toast.success("Link copied to clipboard!");
        } catch (err) {
            toast.error(`Failed to share: ${(err as Error).message}`);
        }
    };

    return (
        <header className="h-12 bg-bg-secondary border-b border-border flex items-center justify-between px-4">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-white font-bold text-sm">
                        M
                    </div>
                    <span className="font-semibold">Move Playground</span>
                </div>
            </div>

            {/* Center: Actions */}
            <div className="flex items-center gap-2">
                {/* Run Button with Dropdown */}
                <div className="relative">
                    <div className="flex">
                        <button
                            type="button"
                            onClick={handleRun}
                            disabled={isExecuting || wsStatus !== "connected"}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-l text-white text-sm font-medium transition-colors"
                        >
                            <Play size={14} fill="currentColor" />
                            {isExecuting ? "Running..." : "Run"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRunMenu(!showRunMenu)}
                            className="px-1.5 py-1.5 bg-accent hover:bg-accent-hover border-l border-white/20 rounded-r text-white transition-colors"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    {showRunMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-bg-tertiary border border-border rounded shadow-lg py-1 min-w-[120px] z-50">
                            <button
                                type="button"
                                onClick={() => {
                                    handleRun();
                                    setShowRunMenu(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary"
                            >
                                Run
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    execute("compile");
                                    setShowRunMenu(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary"
                            >
                                Compile
                            </button>
                        </div>
                    )}
                </div>

                {/* Test Button */}
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={isExecuting || wsStatus !== "connected"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-border disabled:opacity-50 rounded text-sm font-medium transition-colors"
                >
                    <FlaskConical size={14} />
                    Test
                </button>

                {/* Share Button */}
                <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-border rounded text-sm font-medium transition-colors"
                >
                    <Share2 size={14} />
                    Share
                </button>
            </div>

            {/* Right: Settings */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span
                        className={`w-2 h-2 rounded-full ${
                            wsStatus === "connected"
                                ? "bg-accent"
                                : wsStatus === "connecting"
                                  ? "bg-warning animate-pulse"
                                  : "bg-error"
                        }`}
                    />
                    {wsStatus === "connected"
                        ? "Connected"
                        : wsStatus === "connecting"
                          ? "Connecting..."
                          : "Disconnected"}
                </div>
                <button
                    type="button"
                    className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
                >
                    <Settings size={18} className="text-text-secondary" />
                </button>
            </div>
        </header>
    );
}
