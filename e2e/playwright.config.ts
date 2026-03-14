import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "https://localhost:5173",
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: "https://localhost:5000",
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      cwd: "../frontend",
      url: "https://localhost:5173",
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
    },
  ],
});
