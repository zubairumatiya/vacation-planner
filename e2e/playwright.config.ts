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
  // Start your dev servers manually before running E2E tests:
  //   backend:  npx nodemon (or however you start it)
  //   frontend: npm run dev
  webServer: [
    {
      command: "npx nodemon",
      cwd: "../backend",
      url: "https://localhost:5000",
      reuseExistingServer: true,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      cwd: "../frontend",
      url: "https://localhost:5173",
      reuseExistingServer: true,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
    },
  ],
});
