import { BrowserContext, chromium, Page } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve } from 'path';

export const hasChromium = existsSync(chromium.executablePath());

export function logInfo(message: string, data?: unknown): void {
  if (data !== undefined) {
    console.info(`[E2E] ${message}`, data);
    return;
  }
  console.info(`[E2E] ${message}`);
}

export function getExtensionPath(testDirname: string): string {
  return resolve(testDirname, '../../dist');
}

export function assertExtensionBuild(extensionPath: string): void {
  if (!existsSync(extensionPath)) {
    throw new Error(`Extension directory not found: ${extensionPath}. Run 'npm run build' first.`);
  }

  if (!existsSync(resolve(extensionPath, 'manifest.json'))) {
    throw new Error(`manifest.json not found in ${extensionPath}. Extension may not be built correctly.`);
  }
}

export async function checkServerHealth(page: Page): Promise<void> {
  const response = await page.request.get('http://localhost:3000/health');
  if (!response.ok()) {
    throw new Error('Server health check failed');
  }
}

export async function launchExtensionContext(extensionPath: string, userDataDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });
}


export function logWarn(message: string, data?: unknown): void {
  if (data !== undefined) {
    console.warn(`[E2E] ${message}`, data);
    return;
  }
  console.warn(`[E2E] ${message}`);
}
