/**
 * Content Script - Main Entry Point
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

/// <reference types="chrome" />

import { CaptchaDetector } from './captcha-detector';
import { CaptchaDetectionResult, CaptchaType } from '../shared/types/captcha.types';
import { MessageType, ExtensionMessage, MessageResponse } from '../shared/types/messages.types';
import { StorageAPI } from '../shared/api/storage-api';
import { waitForElement, isElementVisible } from '../shared/utils/dom-utils';
import { humanDelay } from '../shared/utils/delay-utils';
import { logger } from '../shared/utils/logger';
import { simulateHumanClick } from '../shared/utils/mouse-simulation';
import { simulatePageInteraction, simulateReadingTime } from '../shared/utils/human-behavior';
import { sendMessage, isRuntimeAvailable, isMainFrame } from '../shared/utils/message-utils';
import { debounce } from '../shared/utils/debounce';
import { retry } from '../shared/utils/retry';
import { detectionCache } from '../shared/utils/detection-cache';
import { intervalManager } from '../shared/utils/interval-manager';
import { compressImage, getBestFormat } from '../shared/utils/image-compression';
// import { CacheAPI } from '../shared/api/cache-api'; // Reserved for future use

class ContentScript {
  private detector: CaptchaDetector;
  private observer: MutationObserver | null = null;
  private isEnabled = false;
  private isProcessing = false;
  private lastDetectionTime = 0;
  private solvingCaptchaId: string | null = null; // Track which CAPTCHA is being solved
  private readonly MIN_DETECTION_INTERVAL = 5000; // 5 seconds between detections (optimized from 2s)
  private readonly RUNTIME_CHECK_INTERVAL = 5000; // Check runtime every 5 seconds
  private readonly PERIODIC_CHECK_INTERVAL = 5000; // 5 seconds (optimized from 3s)

  constructor() {
    this.detector = new CaptchaDetector();
    this.init();
  }

  private async init(): Promise<void> {
    try {
      console.log('[CAPTCHA Solver] init() called');
      console.log('[CAPTCHA Solver] isMainFrame():', isMainFrame());
      
      // Detailed runtime check for debugging
      const runtimeCheck = {
        hasChrome: typeof chrome !== 'undefined',
        hasRuntime: typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined',
        hasId: typeof chrome !== 'undefined' && 
               typeof chrome.runtime !== 'undefined' && 
               typeof chrome.runtime.id !== 'undefined',
        url: window.location.href,
      };
      console.log('[CAPTCHA Solver] Runtime check:', runtimeCheck);
      console.log('[CAPTCHA Solver] isRuntimeAvailable():', isRuntimeAvailable());
      
      // Skip if not in main frame or runtime not available
      if (!isMainFrame()) {
        console.warn('[CAPTCHA Solver] Skipping: not in main frame (likely in iframe)');
        logger.debug('Skipping initialization: not in main frame');
        return;
      }

      if (!isRuntimeAvailable()) {
        console.warn('[CAPTCHA Solver] Skipping: runtime not available', runtimeCheck);
        console.warn('[CAPTCHA Solver] This may be normal on some pages (chrome://, extension://, or localhost health pages)');
        logger.debug('Skipping initialization: runtime not available', runtimeCheck);
        return;
      }
      
      console.log('[CAPTCHA Solver] Runtime available, continuing initialization...');

      // Load configuration
      const config = await StorageAPI.getConfig();
      this.isEnabled = config.enabled && config.autoSolve;
      
      // Initialize logger - always enable for important messages
      logger.setEnabled(true); // Always enabled to see logs in console
      
      // Always log initialization (important for debugging)
      console.log('[CAPTCHA Solver] Extension initialized on page:', window.location.href);
      logger.info('Content script initialized', { 
        url: window.location.href,
        enabled: config.enabled,
        autoSolve: config.autoSolve,
        isEnabled: this.isEnabled
      });
      
      // Warn if auto-solve is disabled
      if (!config.autoSolve) {
        logger.warn('Auto-solve is disabled in settings. Enable it to automatically solve CAPTCHAs.');
      }
      if (!config.enabled) {
        logger.warn('Extension is disabled in settings. Enable it to use CAPTCHA solver.');
      }

    // Listen for configuration changes
    chrome.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.extension_config) {
        const newConfig = changes.extension_config.newValue as typeof config | undefined;
        if (newConfig) {
          const wasEnabled = this.isEnabled;
          this.isEnabled = newConfig.enabled && newConfig.autoSolve;
          logger.setEnabled(newConfig.advanced?.enableLogging || false);
          logger.info('Configuration updated', { enabled: this.isEnabled });

          // Clear cache on config change
          detectionCache.clear();

          // Restart detection if enabled state changed
          if (this.isEnabled && !wasEnabled) {
            this.startDetection();
          } else if (!this.isEnabled && wasEnabled) {
            this.stopDetection();
          }
        }
      }
    });

    // Listen for messages
    chrome.runtime.onMessage.addListener((
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      this.handleMessage(message, sendResponse);
      return true; // Keep channel open for async response
    });

    // Monitor runtime availability and restart if extension is reloaded
    this.startRuntimeMonitoring();

      // Always start detection - it will check isEnabled internally
      // This ensures detection runs even if config changes later
      this.startDetection();
      
      console.log('[CAPTCHA Solver] Detection started. Extension is', this.isEnabled ? 'ENABLED' : 'DISABLED');
    } catch (error) {
      console.error('[CAPTCHA Solver] Initialization error:', error);
      logger.error('Content script initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private handleMessage(
    message: ExtensionMessage | { type: string; detection?: unknown; token?: string; result?: unknown },
    sendResponse: (response: MessageResponse) => void
  ): void {
    switch (message.type) {
      case MessageType.DETECT_CAPTCHA:
        this.handleDetectCaptcha(sendResponse);
        break;
      case MessageType.SOLVE_CAPTCHA:
        this.handleSolveCaptcha(message as ExtensionMessage, sendResponse);
        break;
      case MessageType.INJECT_TOKEN:
        this.handleInjectToken(message as { detection: CaptchaDetectionResult; token: string });
        sendResponse({ success: true });
        break;
      case MessageType.CAPTCHA_SOLVED:
        // Handle result sent via tabs.sendMessage (fallback when channel is closed)
        const captchaSolvedMessage = message as { type: string; result?: { success: boolean; token?: string; error?: string }; token?: string; error?: string; success?: boolean };
        if (captchaSolvedMessage.result || captchaSolvedMessage.token || captchaSolvedMessage.success) {
          console.log('[CAPTCHA Solver] [Content] Received CAPTCHA_SOLVED message via tabs.sendMessage', {
            success: captchaSolvedMessage.result?.success || captchaSolvedMessage.success,
            hasToken: !!captchaSolvedMessage.result?.token || !!captchaSolvedMessage.token,
            error: captchaSolvedMessage.result?.error || captchaSolvedMessage.error,
          });
          // If token is provided, inject it
          if (captchaSolvedMessage.result?.token || captchaSolvedMessage.token) {
            const token = captchaSolvedMessage.result?.token || captchaSolvedMessage.token || '';
            // Try to find detection from cache or use a generic one
            const detections = detectionCache.get(window.location.href);
            if (detections && detections.length > 0) {
              this.handleInjectToken({ detection: detections[0], token });
            }
          }
        }
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  private handleInjectToken(message: { detection: CaptchaDetectionResult; token: string }): void {
    const { detection, token } = message;

    console.log('[CAPTCHA Solver] [Content] handleInjectToken called', {
      type: detection.type,
      tokenLength: token?.length || 0,
      hasToken: !!token && token.length > 0,
    });

    if (!token || token.length === 0) {
      console.error('[CAPTCHA Solver] [Content] Empty token provided!');
      logger.error('Empty token provided for injection', { type: detection.type });
      return;
    }

    try {
      // Inject token based on CAPTCHA type
      switch (detection.type) {
        case CaptchaType.RECAPTCHA_V2:
        case CaptchaType.RECAPTCHA_V3:
          console.log('[CAPTCHA Solver] [Content] Injecting reCAPTCHA token...');
          this.injectRecaptchaToken(token);
          break;
        case CaptchaType.HCAPTCHA:
          console.log('[CAPTCHA Solver] [Content] Injecting hCaptcha token...');
          this.injectHCaptchaToken(token);
          break;
        case CaptchaType.TURNSTILE:
          console.log('[CAPTCHA Solver] [Content] Injecting Turnstile token...');
          this.injectTurnstileToken(token);
          break;
        case CaptchaType.IMAGE_CAPTCHA:
          console.log('[CAPTCHA Solver] [Content] Injecting Image CAPTCHA token...');
          this.injectImageCaptchaToken(token, detection);
          break;
        default:
          console.warn('[CAPTCHA Solver] [Content] Token injection not implemented for type:', detection.type);
      }
    } catch (error) {
      console.error('[CAPTCHA Solver] [Content] Error injecting token:', error);
      logger.error('Error injecting token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: detection.type,
      });
    }
  }

  private injectRecaptchaToken(token: string): void {
    console.log('[CAPTCHA Solver] [Content] injectRecaptchaToken called', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
    });
    
    logger.info('Injecting reCAPTCHA token automatically');
    
    // Method 1: Set token in textarea (most reliable)
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="g-recaptcha-response"]');
    console.log('[CAPTCHA Solver] [Content] Textarea found:', !!textarea);
    
    if (textarea) {
      console.log('[CAPTCHA Solver] [Content] Setting token in textarea...');
      textarea.value = token;
      // Trigger multiple events to ensure the token is recognized
      textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event('keydown', { bubbles: true, cancelable: true }));
      
      // Also try setting value property directly
      Object.defineProperty(textarea, 'value', {
        value: token,
        writable: true,
        configurable: true,
      });
      
      // Verify token was set
      const actualValue = textarea.value;
      console.log('[CAPTCHA Solver] [Content] Token set in textarea', {
        expectedLength: token.length,
        actualLength: actualValue.length,
        matches: actualValue === token,
      });
      
      logger.info('Token set in textarea', { tokenLength: token.length });
    } else {
      console.warn('[CAPTCHA Solver] [Content] Textarea not found, trying alternative methods');
      logger.warn('Textarea not found, trying alternative methods');
    }

    // Method 2: Try to set via grecaptcha callback
    const grecaptcha = (window as unknown as { grecaptcha?: { getResponse: () => string; execute?: (siteKey: string, options: { action: string }) => Promise<string> } }).grecaptcha;
    console.log('[CAPTCHA Solver] [Content] grecaptcha available:', !!grecaptcha);
    
    if (grecaptcha) {
      // Try to find and call callback
      const callbackElement = document.querySelector('[data-callback]');
      const callbackName = callbackElement?.getAttribute('data-callback');
      console.log('[CAPTCHA Solver] [Content] Callback found:', callbackName);
      
      if (callbackName) {
        const callback = (window as unknown as Record<string, unknown>)[callbackName];
        if (typeof callback === 'function') {
          console.log('[CAPTCHA Solver] [Content] Calling existing callback:', callbackName);
          logger.info('Calling reCAPTCHA callback', { callback: callbackName });
          try {
            (callback as (token: string) => void)(token);
            console.log('[CAPTCHA Solver] [Content] ✓ Callback executed successfully');
          } catch (e) {
            console.error('[CAPTCHA Solver] [Content] Error calling callback:', e);
            logger.warn('Error calling callback', { error: e instanceof Error ? e.message : 'Unknown' });
          }
        } else {
          // Callback doesn't exist yet, create it
          console.log('[CAPTCHA Solver] [Content] Creating callback function:', callbackName);
          logger.info('Creating callback function', { callback: callbackName });
          (window as unknown as Record<string, unknown>)[callbackName] = (_receivedToken: string) => {
            console.log('[CAPTCHA Solver] [Content] Created callback executed');
            logger.debug('Callback executed', { callback: callbackName });
            // Token is already set, just trigger events
            if (textarea) {
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
            }
          };
          // Call it with token
          console.log('[CAPTCHA Solver] [Content] Calling created callback with token');
          ((window as unknown as Record<string, (token: string) => void>)[callbackName] as (token: string) => void)(token);
        }
      }
      
      // Method 3: Try to trigger form submission if form exists
      const form = textarea?.closest('form');
      if (form) {
        console.log('[CAPTCHA Solver] [Content] Found form, triggering events');
        logger.debug('Found form, triggering events');
        // Trigger multiple form events
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    }
    
    // Method 4: Try to find all possible token inputs and set them
    const allTextareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
    console.log('[CAPTCHA Solver] [Content] Found textareas:', allTextareas.length);
    for (const ta of allTextareas) {
      if (ta.name && ta.name.includes('recaptcha')) {
        console.log('[CAPTCHA Solver] [Content] Setting token in additional textarea:', ta.name);
        ta.value = token;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        logger.debug('Token set in additional textarea', { name: ta.name });
      }
    }
    
    // Final verification
    const finalTextarea = document.querySelector<HTMLTextAreaElement>('textarea[name="g-recaptcha-response"]');
    const finalToken = finalTextarea?.value || '';
    console.log('[CAPTCHA Solver] [Content] Final token verification:', {
      textareaExists: !!finalTextarea,
      tokenLength: finalToken.length,
      tokenMatches: finalToken === token,
    });
    
    logger.info('Token injection completed', {
      tokenLength: token.length,
      finalTokenLength: finalToken.length,
    });
  }

  private injectHCaptchaToken(token: string): void {
    logger.info('Injecting hCaptcha token automatically');
    
    // Set token in textarea
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="h-captcha-response"]');
    if (textarea) {
      textarea.value = token;
      textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));
      
      Object.defineProperty(textarea, 'value', {
        value: token,
        writable: true,
        configurable: true,
      });
      
      logger.info('Token set in textarea', { tokenLength: token.length });
    }
    
    // Try to trigger callback
    const hcaptcha = (window as unknown as { hcaptcha?: { getResponse: () => string } }).hcaptcha;
    if (hcaptcha) {
      const callbackElement = document.querySelector('[data-callback]');
      const callbackName = callbackElement?.getAttribute('data-callback');
      
      if (callbackName) {
        const callback = (window as unknown as Record<string, unknown>)[callbackName];
        if (typeof callback === 'function') {
          logger.info('Calling hCaptcha callback', { callback: callbackName });
          try {
            (callback as (token: string) => void)(token);
          } catch (e) {
            logger.warn('Error calling callback', { error: e instanceof Error ? e.message : 'Unknown' });
          }
        } else {
          // Create callback if it doesn't exist
          (window as unknown as Record<string, unknown>)[callbackName] = (_receivedToken: string) => {
            logger.debug('hCaptcha callback executed');
          };
          ((window as unknown as Record<string, (token: string) => void>)[callbackName] as (token: string) => void)(token);
        }
      }
    }
    
    logger.info('hCaptcha token injection completed');
  }

  private injectTurnstileToken(token: string): void {
    logger.info('Injecting Turnstile token automatically');
    
    // Set token in input
    const input = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
    if (input) {
      input.value = token;
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));
      
      Object.defineProperty(input, 'value', {
        value: token,
        writable: true,
        configurable: true,
      });
      
      logger.info('Token set in input', { tokenLength: token.length });
    }
    
    // Try to trigger callback via turnstile object
    const turnstile = (window as unknown as { turnstile?: { getResponse: () => string } }).turnstile;
    if (turnstile) {
      const callbackElement = document.querySelector('[data-callback]');
      const callbackName = callbackElement?.getAttribute('data-callback');
      
      if (callbackName) {
        const callback = (window as unknown as Record<string, unknown>)[callbackName];
        if (typeof callback === 'function') {
          logger.info('Calling Turnstile callback', { callback: callbackName });
          try {
            (callback as (token: string) => void)(token);
          } catch (e) {
            logger.warn('Error calling callback', { error: e instanceof Error ? e.message : 'Unknown' });
          }
        } else {
          // Create callback if it doesn't exist
          (window as unknown as Record<string, unknown>)[callbackName] = (_receivedToken: string) => {
            logger.debug('Turnstile callback executed');
          };
          ((window as unknown as Record<string, (token: string) => void>)[callbackName] as (token: string) => void)(token);
        }
      }
    }
    
    logger.info('Turnstile token injection completed');
  }

  private injectImageCaptchaToken(token: string, detection: CaptchaDetectionResult): void {
    logger.info('Injecting Image CAPTCHA token automatically', { tokenLength: token.length });
    
    if (!token || token.length === 0) {
      logger.warn('Empty token provided for image CAPTCHA');
      return;
    }

    // Try to find input field using multiple selectors
    const selectors = [
      'input[name*="captcha"]',
      'input[id*="captcha"]',
      'input[type="text"]',
      'input[type="number"]',
      'input[name*="code"]',
      'input[id*="code"]',
      'input[name*="answer"]',
      'input[id*="answer"]',
    ];

    let input: HTMLInputElement | null = null;
    
    // First, try to find input near the detection element
    if (detection.element) {
      const container = detection.element.closest('form, div, section') || detection.element;
      for (const selector of selectors) {
        input = container.querySelector<HTMLInputElement>(selector);
        if (input) {
          logger.info('Found input near detection element', { selector });
          break;
        }
      }
    }
    
    // If not found, search the entire document
    if (!input) {
      for (const selector of selectors) {
        const inputs = document.querySelectorAll<HTMLInputElement>(selector);
        // Prefer inputs that are visible and near captcha-related elements
        for (const inp of inputs) {
          if (inp.offsetParent !== null) { // Element is visible
            const nearby = inp.closest('[class*="captcha"], [id*="captcha"], [class*="code"], [id*="code"]');
            if (nearby) {
              input = inp;
              logger.info('Found visible input near captcha element', { selector });
              break;
            }
          }
        }
        if (input) break;
        
        // If still not found, use first visible input
        if (!input && inputs.length > 0) {
          for (const inp of inputs) {
            if (inp.offsetParent !== null) {
              input = inp;
              logger.info('Found first visible input', { selector });
              break;
            }
          }
        }
        if (input) break;
      }
    }

    if (input) {
      // Set the token value
      input.value = token;
      
      // Trigger multiple events to ensure the value is recognized
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('keydown', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
      
      // Also try setting value property directly
      Object.defineProperty(input, 'value', {
        value: token,
        writable: true,
        configurable: true,
      });
      
      // Focus the input to ensure it's active
      input.focus();
      
      logger.info('Token set in input field', { 
        tokenLength: token.length,
        inputName: input.name,
        inputId: input.id,
      });
    } else {
      logger.warn('Input field not found for image CAPTCHA token injection');
      
      // Try to find any text input as last resort
      const anyInput = document.querySelector<HTMLInputElement>('input[type="text"]');
      if (anyInput) {
        anyInput.value = token;
        anyInput.dispatchEvent(new Event('input', { bubbles: true }));
        anyInput.dispatchEvent(new Event('change', { bubbles: true }));
        logger.info('Token set in fallback input field');
      }
    }
    
    logger.info('Image CAPTCHA token injection completed');
  }

  private async handleDetectCaptcha(sendResponse: (response: MessageResponse) => void): Promise<void> {
    try {
      const detections = await this.detector.detectAll();
      sendResponse({
        success: true,
        data: detections,
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleSolveCaptcha(
    message: ExtensionMessage,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    if (message.type !== MessageType.SOLVE_CAPTCHA) {
      sendResponse({ success: false, error: 'Invalid message type' });
      return;
    }

    try {
      const result = await this.solveCaptcha(message.detection);
      sendResponse({
        success: result.success,
        data: result,
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private startDetection(): void {
    // Wait for body to be ready
    if (!document.body) {
      // Wait for body to be available
      const bodyObserver = new MutationObserver(() => {
        if (document.body) {
          bodyObserver.disconnect();
          this.startDetection();
        }
      });
      bodyObserver.observe(document.documentElement, {
        childList: true,
        subtree: false,
      });
      return;
    }

    // Initial detection with delay to ensure page is loaded
    intervalManager.setTimeout('initial-detection', () => {
      this.detectAndSolve();
    }, 1000); // Wait 1 second for page to stabilize

    // Periodic detection every 5 seconds (optimized from 3s)
    intervalManager.setInterval('periodic-check', () => {
      if (!this.isEnabled) {
        intervalManager.clearInterval('periodic-check');
        return;
      }
      if (!this.isProcessing) {
        this.detectAndSolve();
      }
    }, this.PERIODIC_CHECK_INTERVAL);

    // Debounced detection function to avoid excessive calls
    const debouncedDetect = debounce(() => {
      if (!this.isProcessing && this.isEnabled) {
        this.detectAndSolve();
      }
    }, 1000); // 1 second debounce (optimized from 500ms)

    // Watch for DOM changes with optimized observer
    this.observer = new MutationObserver(() => {
      debouncedDetect();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true, // Also watch attribute changes (CAPTCHA may change attributes)
      attributeFilter: ['class', 'data-sitekey', 'src'], // Watch relevant attributes
    });
    
    logger.info('Detection started', {
      hasObserver: !!this.observer,
      bodyReady: !!document.body
    });
  }

  private stopDetection(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    intervalManager.clearInterval('periodic-check');
    intervalManager.clearInterval('runtime-check');
    intervalManager.clearTimeout('initial-detection');
  }

  private async detectAndSolve(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Detection already in progress, skipping');
      return;
    }
    
    if (!this.isEnabled) {
      logger.debug('Detection disabled, skipping', { isEnabled: this.isEnabled });
      return;
    }

    // Throttle detections to avoid excessive calls
    const now = Date.now();
    if (now - this.lastDetectionTime < this.MIN_DETECTION_INTERVAL) {
      logger.debug('Detection throttled', { 
        timeSinceLast: now - this.lastDetectionTime,
        minInterval: this.MIN_DETECTION_INTERVAL 
      });
      return;
    }

    this.isProcessing = true;
    this.lastDetectionTime = now;
    
      logger.debug('Starting detection cycle');
      console.log('[CAPTCHA Solver] Starting detection cycle...');

    try {
      // Check if runtime is still available before making any Chrome API calls
      // If runtime is temporarily unavailable, skip this cycle but don't stop permanently
      // Runtime monitoring will handle reinitialization when runtime becomes available again
      if (!isRuntimeAvailable()) {
        // More detailed logging for debugging
        const runtimeCheck = {
          hasChrome: typeof chrome !== 'undefined',
          hasRuntime: typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined',
          hasId: typeof chrome !== 'undefined' && 
                 typeof chrome.runtime !== 'undefined' && 
                 typeof chrome.runtime.id !== 'undefined',
          url: window.location.href,
          isMainFrame: isMainFrame(),
        };
        
        console.warn('[CAPTCHA Solver] Runtime unavailable, skipping detection', runtimeCheck);
        logger.debug('Extension runtime temporarily unavailable, skipping this detection cycle', runtimeCheck);
        
        // If runtime is unavailable, stop periodic checks temporarily
        // This prevents spam of detection attempts when runtime is down
        intervalManager.clearInterval('periodic-check');
        logger.debug('Stopped periodic detection due to runtime unavailability');
        
        // Don't log this as an error if we're on a localhost health check page
        // (it's expected that extension might not work on all localhost pages)
        if (!window.location.href.includes('/health') && 
            !window.location.href.includes('localhost:3001')) {
          // This might be a real issue, but we'll let runtime monitoring handle it
        }
        
        return;
      }
      
      // If runtime is available again, restart periodic checks if they were stopped
      if (intervalManager.getIntervalCount() === 0 && this.isEnabled) {
        logger.debug('Runtime available again, restarting periodic detection');
        intervalManager.setInterval('periodic-check', () => {
          if (!this.isEnabled) {
            intervalManager.clearInterval('periodic-check');
            return;
          }
          if (!this.isProcessing && isRuntimeAvailable()) {
            this.detectAndSolve();
          }
        }, this.PERIODIC_CHECK_INTERVAL);
      }

      let config;
      try {
        config = await StorageAPI.getConfig();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('Extension context invalidated') || 
            errorMessage.includes('Extension was reloaded')) {
          logger.warn('Extension context invalidated during config fetch, stopping detection');
          this.isEnabled = false;
          this.stopDetection();
          return;
        }
        throw error; // Re-throw if it's a different error
      }

      // Check whitelist/blacklist
      if (!this.isUrlAllowed(window.location.href, config)) {
        logger.debug('URL not allowed (whitelist/blacklist)', { url: window.location.href });
        return;
      }

      // Check cache first
      const cached = detectionCache.get(window.location.href);
      if (cached) {
        logger.debug('Using cached detection', { count: cached.length });
        for (const detection of cached) {
          if (this.isCaptchaTypeEnabled(detection.type, config)) {
            logger.info('CAPTCHA found in cache', {
              type: detection.type,
              confidence: detection.confidence,
              siteKey: detection.siteKey,
            });
            // Auto-solve if enabled
            if (config.autoSolve && config.enabled) {
              logger.debug('Auto-solving cached CAPTCHA', { type: detection.type });
              try {
                await this.solveCaptcha(detection);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                if (errorMessage.includes('Extension context invalidated') ||
                    errorMessage.includes('Extension was reloaded') ||
                    errorMessage.includes('message port closed')) {
                  logger.warn('Extension context invalidated during solve, stopping');
                  this.isEnabled = false;
                  this.isProcessing = false;
                  this.stopDetection();
                  return;
                }
                logger.error('Error solving cached CAPTCHA', {
                  type: detection.type,
                  error: errorMessage,
                });
              }
            }
          }
        }
        return;
      }

      // Detect CAPTCHAs with retry logic
      logger.debug('Starting CAPTCHA detection...');
      const detections = await retry(
        () => this.detector.detectAll(),
        {
          maxAttempts: 2,
          delay: 500,
          onRetry: (attempt, error) => {
            logger.warn('Detection retry', { attempt, error: error.message });
          },
        }
      );

      logger.debug(`Detection completed. Found ${detections.length} CAPTCHA(s)`);
      console.log(`[CAPTCHA Solver] Detection completed. Found ${detections.length} CAPTCHA(s)`);

      // Cache detections
      if (detections.length > 0) {
        detectionCache.set(window.location.href, detections);
        detections.forEach(d => {
          console.log(`[CAPTCHA Solver] Found: ${d.type} (confidence: ${d.confidence})`);
        });
      }

      for (const detection of detections) {
        // Check if this CAPTCHA type is enabled
        if (!this.isCaptchaTypeEnabled(detection.type, config)) {
          logger.debug('CAPTCHA type disabled', { type: detection.type });
          continue;
        }

        // Create unique ID for this CAPTCHA
        const captchaId = `${detection.type}-${detection.siteKey || 'no-sitekey'}-${detection.element?.getAttribute('data-sitekey') || 'no-element'}`;
        
        // Skip if this CAPTCHA is already being solved
        if (this.solvingCaptchaId === captchaId) {
          logger.debug('CAPTCHA already being solved, skipping', { 
            type: detection.type,
            captchaId 
          });
          continue;
        }

        console.log('[CAPTCHA Solver] CAPTCHA detected:', detection.type, 'confidence:', detection.confidence);
        logger.info('CAPTCHA detected', {
          type: detection.type,
          confidence: detection.confidence,
          siteKey: detection.siteKey,
        });

        // Send detection notification
        this.notifyDetection(detection);

        // Auto-solve if enabled (check both enabled and autoSolve)
        if (config.autoSolve && config.enabled) {
          console.log('[CAPTCHA Solver] Starting to solve CAPTCHA:', detection.type);
          logger.info('Auto-solving CAPTCHA', { type: detection.type });
          try {
            const result = await this.solveCaptcha(detection);
            if (result.success) {
              console.log('[CAPTCHA Solver] ✓ CAPTCHA solved successfully:', detection.type);
              logger.info('CAPTCHA solved successfully', { type: detection.type });
            } else {
              console.warn('[CAPTCHA Solver] ✗ CAPTCHA solving failed:', detection.type);
              logger.warn('CAPTCHA solving failed', { type: detection.type });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('Extension context invalidated') ||
                errorMessage.includes('Extension was reloaded') ||
                errorMessage.includes('message port closed')) {
              logger.warn('Extension context invalidated during auto-solve, stopping');
              this.isEnabled = false;
              this.isProcessing = false;
              this.stopDetection();
              return;
            }
            logger.error('Error during auto-solve', {
              type: detection.type,
              error: errorMessage,
            });
          } finally {
            // Clear solving flag after attempt (success or failure)
            if (this.solvingCaptchaId === captchaId) {
              this.solvingCaptchaId = null;
            }
          }
        } else {
          logger.debug('Auto-solve skipped', {
            enabled: config.enabled,
            autoSolve: config.autoSolve,
            type: detection.type,
          });
        }
      }

      if (detections.length === 0) {
        logger.debug('No CAPTCHAs detected on this page');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle extension context invalidated gracefully
      if (errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('Extension was reloaded') ||
          errorMessage.includes('message port closed')) {
        logger.warn('Extension context invalidated, stopping detection (will auto-restart when available)', {
          error: errorMessage,
        });
        // Stop processing and disable observer, but keep runtime monitoring active
        this.isEnabled = false;
        this.isProcessing = false;
        this.stopDetection();
        // Note: runtime-check interval is kept active to detect when extension is reloaded
        return;
      }
      
      logger.error('Error in detectAndSolve', {
        error: errorMessage,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async solveCaptcha(detection: CaptchaDetectionResult): Promise<{ success: boolean }> {
    try {
      // Check if runtime is available
      if (!isRuntimeAvailable() || !isMainFrame()) {
        logger.warn('Cannot solve CAPTCHA: runtime not available or not in main frame');
        return { success: false };
      }

      const config = await StorageAPI.getConfig();

      // Hide UI if configured
      if (config.hideUI && detection.element) {
        this.hideCaptchaUI(detection.element);
      }

      // Auto-click checkbox if available
      if (detection.type === CaptchaType.RECAPTCHA_V2 || detection.type === CaptchaType.HCAPTCHA) {
        console.log('[CAPTCHA Solver] Clicking checkbox for:', detection.type);
        await this.autoClickCheckbox(detection);
      }

      // Extract image for image CAPTCHA
      let imageBase64: string | undefined;
      if (detection.type === CaptchaType.IMAGE_CAPTCHA && detection.element) {
        imageBase64 = await this.extractImageBase64(detection.element);
      }

      // Send solve request to background with retry
      console.log('[CAPTCHA Solver] Sending solve request to background service...');
      console.log('[CAPTCHA Solver] Request details:', {
        type: detection.type,
        siteKey: detection.siteKey?.substring(0, 10) + '...',
        hasImageData: !!imageBase64,
      });
      
      const response = await retry(
        () => {
          console.log('[CAPTCHA Solver] Attempting to send message to background service...');
          return sendMessage<MessageResponse>({
            type: MessageType.SOLVE_CAPTCHA,
            detection: {
              ...detection,
              imageBase64,
            },
            timestamp: Date.now(),
          } as ExtensionMessage);
        },
        {
          maxAttempts: 2,
          delay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`[CAPTCHA Solver] Solve request retry ${attempt}:`, error.message);
            logger.warn('Solve request retry', {
              attempt,
              error: error.message,
              type: detection.type,
            });
          },
        }
      );
      
      console.log('[CAPTCHA Solver] Response received from background service:', {
        success: response?.success,
        hasData: !!response?.data,
        hasToken: !!(response?.data as any)?.token,
        tokenLength: (response?.data as any)?.token?.length || 0,
        error: response?.error,
      });

      if (response?.success) {
        console.log('[CAPTCHA Solver] ✓ Solve request successful');
        
        // Check if token is in response data
        const responseData = response?.data as any;
        if (responseData?.token) {
          console.log('[CAPTCHA Solver] Token received in response, injecting...');
          // Token was already injected by service worker via INJECT_TOKEN message
          // But we can also inject it here as a fallback
          this.handleInjectToken({
            detection,
            token: responseData.token,
          });
        } else {
          console.warn('[CAPTCHA Solver] No token in response data');
        }
      } else {
        console.warn('[CAPTCHA Solver] ✗ Solve request failed:', response?.error || 'Unknown error');
      }

      return { success: response?.success || false };
    } catch (error) {
      logger.error('Error solving CAPTCHA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: detection.type,
      });
      return { success: false };
    }
  }

  private async autoClickCheckbox(detection: CaptchaDetectionResult): Promise<void> {
    if (!detection.element) {
      return;
    }

    try {
      const config = await StorageAPI.getConfig();
      const checkbox = await waitForElement('.recaptcha-checkbox, .hcaptcha-box', 5000);

      if (checkbox && isElementVisible(checkbox)) {
        // Simulate page interaction before clicking
        if (config.advanced.humanLikeBehavior) {
          await simulatePageInteraction();
          await simulateReadingTime(300, 800);
        }

        // Human-like delay
        await humanDelay(config.advanced.clickDelay);

        // Simulate human-like click
        if (config.advanced.humanLikeBehavior && config.advanced.mouseMovement) {
          await simulateHumanClick(checkbox, {
            moveMouse: true,
            hoverDuration: Math.random() * 100 + 50,
            clickDelay: Math.random() * 50 + 10,
          });
        } else {
          checkbox.click();
        }
      }
    } catch (error) {
      logger.error('Error auto-clicking checkbox', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private hideCaptchaUI(element: HTMLElement): void {
    element.style.display = 'none';
    element.style.visibility = 'hidden';
    element.style.opacity = '0';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
  }

  /**
   * Extract image as base64 from CAPTCHA element
   */
  private async extractImageBase64(element: HTMLElement): Promise<string | undefined> {
    try {
      // Try multiple strategies to find the image
      let img: HTMLImageElement | null = null;
      
      // Strategy 1: Look within the element with specific selectors
      const selectors = [
        'img[src*="captcha"]',
        'img[alt*="captcha"]',
        'img[alt*="CAPTCHA"]',
        'img.captcha-image',
        'img[class*="captcha"]',
        'img[id*="captcha"]',
        'img',
      ];
      
      for (const selector of selectors) {
        img = element.querySelector<HTMLImageElement>(selector);
        if (img) {
          logger.debug('Found image with selector', { selector });
          break;
        }
      }
      
      // Strategy 2: If not found, search in parent containers
      if (!img) {
        let container: HTMLElement | null = element;
        for (let i = 0; i < 3 && container; i++) {
          container = container.parentElement;
          if (container) {
            for (const selector of selectors) {
              img = container.querySelector<HTMLImageElement>(selector);
              if (img) {
                logger.debug('Found image in parent container', { selector, level: i + 1 });
                break;
              }
            }
            if (img) break;
          }
        }
      }
      
      // Strategy 3: Search document for captcha images near the element
      if (!img) {
        const allImages = document.querySelectorAll<HTMLImageElement>('img');
        for (const candidate of allImages) {
          const alt = candidate.getAttribute('alt')?.toLowerCase() || '';
          const src = candidate.getAttribute('src')?.toLowerCase() || '';
          const className = candidate.classList.toString().toLowerCase();
          
          // Check if it's a captcha image (but not reCAPTCHA/hCaptcha)
          if ((alt.includes('captcha') || src.includes('captcha') || className.includes('captcha')) &&
              !src.includes('recaptcha') && !src.includes('hcaptcha') && !src.includes('gstatic.com')) {
            // Check if it's near our element
            const rect = candidate.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const distance = Math.abs(rect.top - elementRect.top) + Math.abs(rect.left - elementRect.left);
            
            if (distance < 500) { // Within 500px
              img = candidate;
              logger.debug('Found captcha image near element', { distance });
              break;
            }
          }
        }
      }
      
      if (!img) {
        logger.warn('No image found in CAPTCHA element or nearby');
        return undefined;
      }

      // Create canvas to convert image to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        logger.error('Failed to get canvas context');
        return undefined;
      }

      // Wait for image to load
      await new Promise<void>((resolve, reject) => {
        if (img!.complete && img!.naturalWidth > 0) {
          resolve();
        } else {
          img!.onload = () => resolve();
          img!.onerror = () => reject(new Error('Failed to load image'));
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('Image load timeout')), 5000);
        }
      });

      // Set canvas size
      const width = img.naturalWidth || img.width || img.clientWidth;
      const height = img.naturalHeight || img.height || img.clientHeight;
      
      if (width === 0 || height === 0) {
        logger.error('Image has zero dimensions', { width, height });
        return undefined;
      }
      
      canvas.width = width;
      canvas.height = height;

      // Try to draw image to canvas
      try {
        ctx.drawImage(img, 0, 0);
      } catch (error) {
        // CORS error - try to fetch image via proxy or use alternative method
        logger.warn('Direct canvas draw failed (possibly CORS), trying alternative method', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Try to fetch the image using fetch API (might work if CORS allows)
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          // Use createImageBitmap if available (modern browsers)
          if (typeof (window as any).createImageBitmap !== 'undefined') {
            const imageBitmap = await (window as any).createImageBitmap(blob);
            
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            ctx.drawImage(imageBitmap, 0, 0);
            imageBitmap.close();
          } else {
            // Fallback: create image from blob URL
            const blobUrl = URL.createObjectURL(blob);
            const fallbackImg = new Image();
            await new Promise((resolve, reject) => {
              fallbackImg.onload = resolve;
              fallbackImg.onerror = reject;
              fallbackImg.src = blobUrl;
              setTimeout(() => reject(new Error('Image load timeout')), 5000);
            });
            canvas.width = fallbackImg.width;
            canvas.height = fallbackImg.height;
            ctx.drawImage(fallbackImg, 0, 0);
            URL.revokeObjectURL(blobUrl);
          }
        } catch (fetchError) {
          logger.error('Alternative image fetch also failed', {
            error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          });
          // Last resort: try to use the image even if CORS fails
          // Some browsers might still allow it
          ctx.drawImage(img, 0, 0);
        }
      }

      // Convert to base64 (uncompressed first)
      const uncompressedBase64 = canvas.toDataURL('image/png');
      
      if (!uncompressedBase64 || uncompressedBase64.length < 100) {
        logger.error('Generated base64 is too short or empty');
        return undefined;
      }
      
      // Compress image before sending
      try {
        const compressedBase64 = await compressImage(uncompressedBase64, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.8,
          format: getBestFormat(),
        });
        
        logger.info('Image extracted and compressed successfully', {
          width,
          height,
          originalSize: uncompressedBase64.length,
          compressedSize: compressedBase64.length,
          compressionRatio: ((1 - compressedBase64.length / uncompressedBase64.length) * 100).toFixed(1) + '%',
        });
        
        return compressedBase64;
      } catch (compressionError) {
        logger.warn('Image compression failed, using uncompressed', {
          error: compressionError instanceof Error ? compressionError.message : 'Unknown error',
        });
        return uncompressedBase64;
      }
    } catch (error) {
      logger.error('Failed to extract image base64', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  private isUrlAllowed(url: string, config: typeof import('../shared/constants/config-defaults').DEFAULT_CONFIG): boolean {
    // Check blacklist first
    if (config.blacklist.some((pattern) => url.includes(pattern))) {
      logger.debug('URL blocked by blacklist', { url, pattern: config.blacklist.find((p) => url.includes(p)) });
      return false;
    }

    // Check whitelist
    if (config.whitelist.length > 0) {
      const allowed = config.whitelist.some((pattern) => url.includes(pattern));
      if (!allowed) {
        logger.debug('URL not in whitelist', { url, whitelist: config.whitelist });
      }
      return allowed;
    }

    return true;
  }

  private isCaptchaTypeEnabled(
    type: CaptchaType,
    config: typeof import('../shared/constants/config-defaults').DEFAULT_CONFIG
  ): boolean {
    switch (type) {
      case CaptchaType.RECAPTCHA_V2:
        return config.captchaTypes.recaptchaV2;
      case CaptchaType.RECAPTCHA_V3:
        return config.captchaTypes.recaptchaV3;
      case CaptchaType.HCAPTCHA:
        return config.captchaTypes.hcaptcha;
      case CaptchaType.TURNSTILE:
        return config.captchaTypes.turnstile;
      case CaptchaType.IMAGE_CAPTCHA:
        return config.captchaTypes.imageCaptcha;
      default:
        return false;
    }
  }

  private notifyDetection(detection: CaptchaDetectionResult): void {
    // Skip if runtime not available
    if (!isRuntimeAvailable() || !isMainFrame()) {
      return;
    }

    // Fire and forget - don't wait for response
    sendMessage({
      type: MessageType.CAPTCHA_DETECTED,
      detection,
      timestamp: Date.now(),
    } as ExtensionMessage).catch((error) => {
      // Silently fail for notifications
      logger.debug('Failed to notify detection', { error: error.message });
    });
  }

  /**
   * Monitor runtime availability and restart if extension is reloaded
   */
  private startRuntimeMonitoring(): void {
    // Check runtime availability periodically
    intervalManager.setInterval('runtime-check', () => {
      if (!isRuntimeAvailable()) {
        // Runtime is not available, but don't stop yet - might be temporary
        logger.debug('Runtime temporarily unavailable');
        
        // Stop periodic detection if runtime is unavailable
        intervalManager.clearInterval('periodic-check');
        logger.debug('Stopped periodic detection due to runtime unavailability (monitoring)');
        return;
      }

      // If runtime is available but we're disabled due to context invalidation,
      // try to reinitialize
      if (!this.isEnabled && isRuntimeAvailable()) {
        logger.info('Runtime available again, attempting to reinitialize');
        this.reinitialize();
      }
      
      // If runtime is available and we're enabled, ensure periodic detection is running
      if (this.isEnabled && intervalManager.getIntervalCount() === 0) {
        logger.debug('Runtime available, restarting periodic detection (monitoring)');
        intervalManager.setInterval('periodic-check', () => {
          if (!this.isEnabled) {
            intervalManager.clearInterval('periodic-check');
            return;
          }
          if (!this.isProcessing && isRuntimeAvailable()) {
            this.detectAndSolve();
          }
        }, this.PERIODIC_CHECK_INTERVAL);
      }
    }, this.RUNTIME_CHECK_INTERVAL);
  }

  /**
   * Reinitialize content script after extension reload
   */
  private async reinitialize(): Promise<void> {
    try {
      // Check if runtime is available
      if (!isRuntimeAvailable()) {
        logger.debug('Runtime not available for reinitialization');
        return;
      }

      // Clear existing state
      this.stopDetection();

      // Reset state
      this.isProcessing = false;
      this.lastDetectionTime = 0;
      this.solvingCaptchaId = null; // Reset solving flag

      // Try to get config to verify runtime is working
      try {
        const config = await StorageAPI.getConfig();
        this.isEnabled = config.enabled && config.autoSolve;
        logger.setEnabled(config.advanced.enableLogging);
        logger.info('Content script reinitialized after extension reload', {
          enabled: config.enabled,
          autoSolve: config.autoSolve,
          isEnabled: this.isEnabled,
        });

        // Restart detection if enabled
        if (this.isEnabled) {
          this.startDetection();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('Extension context invalidated') ||
            errorMessage.includes('Extension was reloaded')) {
          logger.debug('Extension still reloading, will retry later');
          this.isEnabled = false;
        } else {
          logger.error('Error during reinitialization', { error: errorMessage });
        }
      }
    } catch (error) {
      logger.error('Error in reinitialize', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopDetection();
    intervalManager.clearAll(); // Clear all intervals and timeouts
    detectionCache.clear();
    this.isEnabled = false;
    this.isProcessing = false;
  }
}

// Initialize content script
(function() {
  // ALWAYS log that script is loading - this helps debug if script is injected
  console.log('[CAPTCHA Solver] Content script file loaded');
  console.log('[CAPTCHA Solver] Document ready state:', document.readyState);
  console.log('[CAPTCHA Solver] Current URL:', window.location.href);
  
  // Suppress common third-party script errors
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Helper function to check if error should be filtered
  const shouldFilterError = (message: string): boolean => {
    if (message.includes('[CAPTCHA Solver]')) {
      return false; // Never filter our own messages
    }
    
    // Filter common third-party extension errors
    const filterPatterns = [
      'chrome-extension://invalid',
      'Failed to load resource',
      'net::ERR_FAILED',
      'ERR_FILE_NOT_FOUND',
      'ERR_BLOCKED_BY_CLIENT',
    ];
    
    return filterPatterns.some(pattern => message.includes(pattern));
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    // Filter out common third-party script errors
    if (shouldFilterError(message)) {
      // Silently ignore these errors - they're from third-party scripts
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    // Filter out common third-party script warnings
    if (shouldFilterError(message)) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Initialize immediately or wait for DOM
  const init = () => {
    console.log('[CAPTCHA Solver] Initializing ContentScript...');
    try {
      new ContentScript();
    } catch (error) {
      console.error('[CAPTCHA Solver] Failed to initialize:', error);
    }
  };

  if (document.readyState === 'loading') {
    console.log('[CAPTCHA Solver] Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[CAPTCHA Solver] DOMContentLoaded fired');
      init();
    });
  } else {
    console.log('[CAPTCHA Solver] DOM already ready, initializing immediately');
    init();
  }
})();
