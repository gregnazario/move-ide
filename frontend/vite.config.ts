import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Override when the backend runs on a non-default port (PLAYGROUND_BACKEND_ORIGIN).
const backendOrigin =
    process.env.PLAYGROUND_BACKEND_ORIGIN ?? "http://localhost:8080";

// monaco-editor 0.56 rewrote its exports map ("./*" -> "./esm/vs/*.js"), which
// mangles monaco-vim's UMD require of "monaco-editor/esm/vs/editor/editor.api"
// into a nonexistent "./esm/vs/esm/vs/..." path. Alias it back to the real file.
const monacoEditorApi = path.resolve(
    import.meta.dirname,
    "node_modules/monaco-editor/esm/vs/editor/editor.api.js",
);
const monacoEditorApiAlias = {
    "monaco-editor/esm/vs/editor/editor.api": monacoEditorApi,
};

export default defineConfig({
    plugins: [tailwindcss(), react()],
    resolve: {
        alias: monacoEditorApiAlias,
    },
    optimizeDeps: {
        esbuildOptions: {
            alias: monacoEditorApiAlias,
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes("@aptos-labs/ts-sdk")) {
                        return "aptos-sdk";
                    }
                    if (id.includes("jszip")) {
                        return "jszip";
                    }
                    if (id.includes("wallet-adapter")) {
                        return "aptos-wallets";
                    }
                    return undefined;
                },
            },
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
        globals: true,
        include: ["src/**/*.test.{ts,tsx}"],
        exclude: ["node_modules/**", "e2e/**"],
    },
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: backendOrigin,
                changeOrigin: true,
            },
            "/ws": {
                target: backendOrigin.replace(/^http/, "ws"),
                ws: true,
            },
        },
    },
});
