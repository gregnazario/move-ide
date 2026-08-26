import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Override when the backend runs on a non-default port (PLAYGROUND_PORT).
const backendOrigin =
    process.env.PLAYGROUND_BACKEND_ORIGIN ?? "http://localhost:8080";

export default defineConfig({
    plugins: [tailwindcss(), react()],
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
