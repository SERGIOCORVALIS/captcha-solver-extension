/**
 * E2E Tests for CAPTCHA Detection
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 * 
 * Note: These tests require internet connection and may be slow.
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

test.describe('CAPTCHA Detection', () => {
  test('should detect reCAPTCHA v2 elements on demo page', async ({ page }) => {
    test.setTimeout(30000); // Increase timeout for network requests
    
    // Navigate to reCAPTCHA demo page
    await page.goto('https://www.google.com/recaptcha/api2/demo', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Check if reCAPTCHA container is present
    const recaptchaContainer = page.locator('.g-recaptcha, [data-sitekey]').first();
    await expect(recaptchaContainer).toBeVisible({ timeout: 15000 });
  });

  test('should detect hCaptcha elements on demo page', async ({ page }) => {
    test.setTimeout(30000);
    
    // Navigate to hCaptcha demo page
    await page.goto('https://www.hcaptcha.com/demo', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Check if hCaptcha container is present
    const hcaptchaContainer = page.locator('.h-captcha, [data-sitekey]').first();
    await expect(hcaptchaContainer).toBeVisible({ timeout: 15000 });
  });

  test('should handle page without CAPTCHA', async ({ page }) => {
    // Navigate to a regular page
    await page.goto('https://example.com', {
      waitUntil: 'networkidle',
    });

    // Verify no CAPTCHA elements are present
    const recaptcha = await page.locator('.g-recaptcha').count();
    const hcaptcha = await page.locator('.h-captcha').count();

    expect(recaptcha).toBe(0);
    expect(hcaptcha).toBe(0);
  });
});
