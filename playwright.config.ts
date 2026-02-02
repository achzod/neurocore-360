import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5000';
const useWebServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: useWebServer
    ? {
        command: 'npm run dev',
        url: 'http://localhost:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : undefined,
});
