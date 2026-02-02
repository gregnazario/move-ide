import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ConfigPanel } from "./ConfigPanel";
import { EditorPane } from "./EditorPane";
import { FileTree } from "./FileTree";
import { OutputPane } from "./OutputPane";

export function Workspace() {
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
