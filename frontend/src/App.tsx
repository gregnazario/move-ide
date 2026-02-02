import { Toaster } from "sonner";
import { Header } from "./components/Header";
import { Workspace } from "./components/Workspace";

function App() {
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
