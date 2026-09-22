import { defineConfig } from "@playwright/test";

/**
 * Config for the visual/responsive regression suite.
 * The Lovable sandbox always serves the dev app at http://localhost:8080,
 * so we do NOT spawn a webServer here — tests run against the live preview.
 */
export default defineConfig({
  testDir: "./tests/visual",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    // The sandbox ships Chromium at a fixed path; using it avoids requiring
    // `npx playwright install`. Override with PW_CHROME_PATH if needed.
    launchOptions: {
      executablePath:
        process.env.PW_CHROME_PATH || "/chromium-1194/chrome-linux/chrome",
    },
  },
});
