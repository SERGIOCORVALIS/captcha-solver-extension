import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run build',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
