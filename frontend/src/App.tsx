import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { Header } from "./components/Header";
import { Workspace } from "./components/Workspace";
import { useWorkspaceStore } from "./store";

function App() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        if (!id) return;

        const loadShare = async () => {
            try {
                const response = await fetch(`/api/load/${id}`);
                if (!response.ok) {
                    throw new Error("Failed to load shared code");
                }
                const data = await response.json();
                useWorkspaceStore
                    .getState()
                    .loadWorkspace(data.files, data.named_addresses ?? {});
                useWorkspaceStore.getState().setGistId(id);
            } catch (err) {
                toast.error(`Failed to load share: ${(err as Error).message}`);
            }
        };

        void loadShare();
    }, []);

    return (
        <div className="h-screen flex flex-col bg-bg-primary text-text-primary">
            <Header />
            <Workspace />
            <Toaster
                position="bottom-right"
                theme="dark"
                toastOptions={{
                    style: {
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                    },
                }}
            />
        </div>
    );
}

export default App;
