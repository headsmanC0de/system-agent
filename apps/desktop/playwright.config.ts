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
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
