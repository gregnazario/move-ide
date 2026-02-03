import { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { ConfigPanel } from "./ConfigPanel";
import { EditorPane } from "./EditorPane";
import { FileTree } from "./FileTree";
import { OutputPane } from "./OutputPane";

type MobileTab = "files" | "editor" | "output" | "config";

export function Workspace() {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [activeTab, setActiveTab] = useState<MobileTab>("editor");

    if (isMobile) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    {activeTab === "files" && <FileTree />}
                    {activeTab === "editor" && <EditorPane />}
                    {activeTab === "output" && <OutputPane />}
                    {activeTab === "config" && <ConfigPanel />}
                </div>
                <div className="h-12 bg-bg-secondary border-t border-border flex items-center justify-around">
                    {[
                        { id: "files", label: "Files" },
                        { id: "editor", label: "Editor" },
                        { id: "output", label: "Output" },
                        { id: "config", label: "Config" },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() =>
                                    setActiveTab(tab.id as MobileTab)
                                }
                                className={`flex-1 h-full text-sm font-medium transition-colors ${
                                    isActive
                                        ? "text-text-primary bg-bg-tertiary"
                                        : "text-text-secondary hover:text-text-primary"
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden">
            <PanelGroup direction="horizontal">
                {/* File Tree */}
                <Panel defaultSize={15} minSize={10} maxSize={25}>
                    <FileTree />
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-text-link transition-colors cursor-col-resize" />

                {/* Editor */}
                <Panel defaultSize={55} minSize={30}>
                    <EditorPane />
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-text-link transition-colors cursor-col-resize" />

                {/* Right Panel: Output + Config */}
                <Panel defaultSize={30} minSize={20} maxSize={40}>
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={60} minSize={20}>
                            <OutputPane />
                        </Panel>

                        <PanelResizeHandle className="h-1 bg-border hover:bg-text-link transition-colors cursor-row-resize" />

                        <Panel defaultSize={40} minSize={15}>
                            <ConfigPanel />
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>
        </div>
    );
}
