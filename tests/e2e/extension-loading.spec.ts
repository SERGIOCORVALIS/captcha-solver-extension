/**
 * E2E Tests for Extension Loading
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Extension Loading @smoke', () => {
  test('should have valid manifest.json', () => {
    const manifestPath = join(__dirname, '../../dist/manifest.json');
    
    expect(existsSync(manifestPath)).toBe(true);
    
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBeTruthy();
    expect(manifest.version).toBeTruthy();
  });

  test('should have all required files', () => {
    const distPath = join(__dirname, '../../dist');

    const requiredFiles = [
      'manifest.json',
      'background/service-worker.js',
      'content/content-script.js',
      'popup/popup.html',
      'popup/popup.js',
      'options/options.html',
      'options/options.js',
      'icons/icon16.png',
      'icons/icon48.png',
      'icons/icon128.png',
    ];

    for (const file of requiredFiles) {
      const filePath = join(distPath, file);
      expect(existsSync(filePath)).toBe(true);
    }
  });
});
