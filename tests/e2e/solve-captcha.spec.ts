/**
 * E2E Test for CAPTCHA Solving
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 * 
 * This test opens Chrome with the extension loaded and tests CAPTCHA solving
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { assertExtensionBuild, checkServerHealth, getExtensionPath, hasChromium, launchExtensionContext, logInfo, logWarn } from './helpers/e2e-helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
test.skip(!hasChromium, 'Playwright Chromium is not installed in this environment.');

test.describe('CAPTCHA Solving @full', () => {

  test('should solve reCAPTCHA v2 on demo page', async () => {
    test.setTimeout(120000); // 2 minutes timeout for solving
    
    // Path to the built extension (must be absolute)
    const extensionPath = getExtensionPath(__dirname);
    
    assertExtensionBuild(extensionPath);
    
    logInfo(`Loading extension from: ${extensionPath}`);
    
    // Launch Chrome with extension
    // Use a temporary user data directory for better extension loading
    const userDataDir = resolve(__dirname, '../../.playwright-user-data');
    const context = await launchExtensionContext(extensionPath, userDataDir);
    
    // Verify extension is loaded and configure it
    const extensionsPage = await context.newPage();
    let extensionEnabled = false;
    try {
      await extensionsPage.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 10000 });
      await extensionsPage.waitForTimeout(2000);
      
      // Enable developer mode if needed
      const devModeToggle = extensionsPage.locator('#devMode');
      if (await devModeToggle.isVisible()) {
        const isChecked = await devModeToggle.getAttribute('aria-checked') === 'true';
        if (!isChecked) {
          await devModeToggle.click();
          await extensionsPage.waitForTimeout(1000);
        }
      }
      
      const extensionCount = await extensionsPage.locator('extensions-item').count();
      logInfo(`✅ Extensions loaded: ${extensionCount}`);
      
      if (extensionCount > 0) {
        // Check if extension is enabled
        const extensionItems = await extensionsPage.locator('extensions-item').all();
        for (const item of extensionItems) {
          const toggle = item.locator('#enableToggle');
          if (await toggle.isVisible()) {
            const isEnabled = await toggle.getAttribute('aria-checked') === 'true';
            if (!isEnabled) {
              logInfo('Enabling extension...');
              await toggle.click();
              await extensionsPage.waitForTimeout(1000);
            }
            extensionEnabled = true;
            break;
          }
        }
      }
    } catch (error) {
      logWarn('Could not verify/configure extension via chrome://extensions:', error);
      // Assume extension is enabled if we can't check
      extensionEnabled = true;
    } finally {
      await extensionsPage.close();
    }
    
    // Store extensionEnabled for later use
    const extensionWasEnabled = extensionEnabled;
    
    // Configure extension via options page
    logInfo('Configuring extension...');
    const optionsPage = await context.newPage();
    try {
      // Get extension ID from chrome://extensions
      const extPage = await context.newPage();
      await extPage.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 10000 });
      await extPage.waitForTimeout(2000);
      
      // Try to get extension ID
      const extensionId = await extPage.evaluate(() => {
        const items = document.querySelectorAll('extensions-item');
        for (const item of items) {
          const id = item.getAttribute('id');
          if (id && id.startsWith('extension-')) {
            return id.replace('extension-', '');
          }
        }
        return null;
      }).catch(() => null);
      
      await extPage.close();
      
      if (extensionId) {
        // Open options page
        const optionsUrl = `chrome-extension://${extensionId}/options/options.html`;
        await optionsPage.goto(optionsUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await optionsPage.waitForTimeout(2000);
        
        // Configure API settings
        // Note: This requires the options page to be accessible and have form fields
        // For now, we'll just verify the page loads
        logInfo('Options page accessible');
      }
    } catch (error) {
      logWarn('Could not configure extension via options page:', error);
    } finally {
      await optionsPage.close();
    }

    const page = await context.newPage();
    
    // Set up console listener BEFORE navigation (Playwright best practice)
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('[CAPTCHA Solver]') || text.includes('CAPTCHA') || text.includes('ERROR')) {
        logInfo(`[Console ${msg.type()}] ${text}`);
      }
    });

    // Set up page error listener
    page.on('pageerror', error => {
      logInfo(`[Page Error] ${error.message}`);
    });

    // Check if server is running
    try {
      await checkServerHealth(page);
      logInfo('Server is running');
    } catch (error) {
      throw new Error('Server is not running. Start it with: cd server && start-server-dev.bat');
    }
    
    try {
      // Navigate to reCAPTCHA demo page
      logInfo('Navigating to reCAPTCHA demo page...');
      await page.goto('https://www.google.com/recaptcha/api2/demo', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for reCAPTCHA to load
      logInfo('Waiting for reCAPTCHA to load...');
      const recaptchaContainer = page.locator('.g-recaptcha, [data-sitekey]').first();
      await expect(recaptchaContainer).toBeVisible({ timeout: 15000 });

      // Wait for extension to initialize
      logInfo('Waiting for extension to initialize...');
      await page.waitForTimeout(5000);
      
      // Check if extension is active by looking for extension logs or Chrome API
      const extensionLogs = consoleMessages.filter(m => 
        m.includes('[CAPTCHA Solver]') || m.includes('Content script initialized')
      );
      
      // Also check if Chrome extension API is available (indicates extension context)
      const hasChromeAPI = await page.evaluate(() => {
        return typeof chrome !== 'undefined' && 
               typeof chrome.runtime !== 'undefined' && 
               chrome.runtime.id !== undefined;
      }).catch(() => false);
      
      // Check if content script injected any global variables or functions
      await page.evaluate(() => {
        // Check for any signs of content script execution
        return document.querySelector('[data-captcha-solver]') !== null ||
               window.location.href.includes('recaptcha');
      }).catch(() => false);
      
      if (extensionLogs.length === 0 && !hasChromeAPI) {
        logWarn('⚠️ No extension logs detected. Extension may not be loaded or content script not executing.');
        logWarn('⚠️ Chrome extension API not available in page context.');
        // Don't fail yet - extension might still work, just not logging
      } else {
        logInfo(`✅ Extension context: Chrome API=${hasChromeAPI}, Logs=${extensionLogs.length}`);
      }
      
      // Wait for extension to detect and solve CAPTCHA
      logInfo('Waiting for extension to solve CAPTCHA...');
      
      // Check if textarea with token appears (indicates CAPTCHA is solved)
      const tokenTextarea = page.locator('textarea[name="g-recaptcha-response"]');
      
      // Poll for token value
      let tokenFound = false;
      const startTime = Date.now();
      const maxWait = 90000; // 90 seconds
      
      while (Date.now() - startTime < maxWait && !tokenFound) {
        try {
          const tokenValue = await tokenTextarea.inputValue();
          if (tokenValue && tokenValue.length > 20) {
            tokenFound = true;
            logInfo('✅ CAPTCHA solved successfully!');
            logInfo(`Token length: ${tokenValue.length}`);
            break;
          }
        } catch {
          // Continue waiting
        }
        
        // Check console for errors
        const errorMessages = consoleMessages.filter(m => 
          m.includes('ERROR') || m.includes('Failed') || m.includes('error')
        );
        if (errorMessages.length > 0) {
          logInfo('Errors detected:', errorMessages.slice(-3));
        }
        
        await page.waitForTimeout(2000); // Check every 2 seconds
      }
      
      if (!tokenFound) {
        const extensionLogs = consoleMessages.filter(m => 
          m.includes('[CAPTCHA Solver]') || m.includes('CAPTCHA')
        );
        const errorLogs = consoleMessages.filter(m => 
          m.includes('ERROR') || m.includes('Failed') || m.includes('error')
        );
        
        logInfo('❌ CAPTCHA was not solved within timeout');
        logInfo(`Extension logs: ${extensionLogs.length} message(s)`);
        logInfo(`Error logs: ${errorLogs.length} message(s)`);
        if (errorLogs.length > 0) {
          logInfo('Recent errors:', errorLogs.slice(-5));
        }
        // Use the extension state we checked earlier (extensionWasEnabled)
        // Don't re-check chrome://extensions as it may timeout or fail
        
        // Extension is loaded but CAPTCHA wasn't solved - provide diagnostic info
        // Note: Content script may not execute in Playwright due to known limitations
        throw new Error(
          `CAPTCHA not solved within timeout. ` +
          `Extension loaded: ${extensionWasEnabled}, Extension logs: ${extensionLogs.length}, Errors: ${errorLogs.length}. ` +
          `Possible causes: 1) Content script not executing (known Playwright limitation - check service worker console), ` +
          `2) API key not configured (check extension options page), ` +
          `3) Server not responding (check server logs), ` +
          `4) Auto-solve disabled (check extension settings)`
        );
      }
      
      // Verify token is not empty
      const tokenValue = await tokenTextarea.inputValue();
      expect(tokenValue.length).toBeGreaterThan(20);
      
      // Take a screenshot
      await page.screenshot({ path: 'test-results/captcha-solved.png', fullPage: true });
      
    } catch (error) {
      // Take screenshot on failure
      await page.screenshot({ path: 'test-results/captcha-failed.png', fullPage: true });
      throw error;
    } finally {
      // Keep browser open for a few seconds to see the result
      await page.waitForTimeout(3000);
      await context.close();
    }
  });
});

