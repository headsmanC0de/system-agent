import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
    baseURL: "http://127.0.0.1:5173",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  webServer: {
    command: "npx vite --port 5173 --host 0.0.0.0",
    port: 5173,
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    // Pure-Node specs: no browser, no page.
    {
      name: "unit",
      testMatch: /(sse|ipc-contract|ecoflow(?:-.+)?|ecoflow-helper)\.spec\.ts/,
    },
    {
      name: "browser",
      use: { browserName: "chromium" },
      testMatch: /(renderer|functional-.+|projects|screenshots)\.spec\.ts/,
    },
    // Real built Electron app (requires `electron-vite build` first).
    {
      name: "e2e",
      testMatch: /electron\.spec\.ts/,
    },
  ],
});
