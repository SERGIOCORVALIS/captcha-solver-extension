import { defineConfig, devices } from '@playwright/test';

export function createPlaywrightConfig(grep?: RegExp) {
  return defineConfig({
    testDir: './tests/e2e',
    ...(grep ? { grep } : {}),
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
  });
}
