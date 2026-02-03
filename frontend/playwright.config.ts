import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    timeout: 30_000,
    retries: 0,
    use: {
        baseURL: "http://127.0.0.1:3000",
        trace: "on-first-retry",
    },
    webServer: {
        command: "bun run dev -- --host 127.0.0.1 --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
    },
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" },
        },
    ],
});
