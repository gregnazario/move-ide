import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "../store";

export function OutputPane() {
    const { output, clearOutput, isExecuting } = useWorkspaceStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const outputCount = output.length;

    // Auto-scroll to bottom when new output arrives
    useEffect(() => {
        if (outputCount > 0 && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [outputCount]);

    const getLineColor = (type: string) => {
        switch (type) {
            case "stderr":
            case "error":
                return "text-error";
            case "success":
                return "text-accent";
            case "system":
                return "text-text-secondary";
            default:
                return "text-text-primary";
        }
    };

    const getPrefix = (type: string) => {
        switch (type) {
            case "success":
                return "✓ ";
            case "error":
                return "✗ ";
            case "system":
                return "[system] ";
            default:
                return "";
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            {/* Header */}
            <div className="h-8 px-3 flex items-center justify-between border-b border-border bg-bg-secondary">
                <span className="text-xs font-medium text-text-secondary">
                    Output
                </span>
                <div className="flex items-center gap-2">
                    {isExecuting && (
                        <span className="text-xs text-warning animate-pulse">
                            Running...
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={clearOutput}
                        className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                        title="Clear output"
                    >
                        <Trash2 size={12} className="text-text-secondary" />
                    </button>
                </div>
            </div>

            {/* Output Content */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto p-3 font-mono text-sm"
            >
                {output.length === 0 ? (
                    <span className="text-text-secondary">
                        Output will appear here when you run your code...
                    </span>
                ) : (
                    output.map((line) => (
                        <div
                            key={`${line.timestamp}-${line.type}`}
                            className={`whitespace-pre-wrap break-all ${getLineColor(line.type)}`}
                        >
                            {getPrefix(line.type)}
                            {line.content}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
