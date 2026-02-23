/**
 * Background Service Worker
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { MessageType, ExtensionMessage, MessageResponse } from '../shared/types/messages.types';
import { StorageAPI } from '../shared/api/storage-api';
import { SolverAPI, SolveRequest } from '../shared/api/solver-api';
import { CaptchaType, CaptchaSolveResult } from '../shared/types/captcha.types';
import { logger } from '../shared/utils/logger';
import { CacheAPI } from '../shared/api/cache-api';
import { RateLimiter } from '../shared/api/rate-limiter';
import { RequestQueue } from '../shared/api/request-queue';
import { showCaptchaSolvedNotification, showErrorNotification } from '../shared/utils/notifications';
import { measurePerformance } from '../shared/utils/performance';
import { startCacheCleanup } from '../shared/utils/memory-manager';
import { decryptApiKey, isEncrypted } from '../shared/utils/encryption';

class ServiceWorker {
  private solverAPI: SolverAPI | null = null;
  private rateLimiter: RateLimiter;
  private requestQueue: RequestQueue<{ success: boolean; token?: string; error?: string }>;

  constructor() {
    // Initialize rate limiter: max 10 requests per minute
    this.rateLimiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60 * 1000,
    });

    // Initialize request queue
    this.requestQueue = new RequestQueue(this.rateLimiter);

    this.init();
  }

  private async init(): Promise<void> {
    // Initialize solver API
    const config = await StorageAPI.getConfig();
    this.solverAPI = new SolverAPI(config.apiConfig);
    
    // Initialize logger
    logger.setEnabled(config.advanced.enableLogging);
    
    // Always log initialization (important for debugging)
    logger.info('Service worker initialized', {
      provider: config.apiConfig.provider,
      enabled: config.enabled,
    });

    // Listen for messages
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      // For SOLVE_CAPTCHA, send immediate acknowledgment and handle result via tabs.sendMessage
      if (message.type === MessageType.SOLVE_CAPTCHA) {
        // Send immediate acknowledgment to keep channel open
        try {
          sendResponse({ success: true, acknowledged: true });
        } catch (e) {
          // Channel may be closed, continue anyway
          logger.debug('Could not send immediate acknowledgment', {
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
        
        // Handle solve asynchronously and send result via tabs.sendMessage
        this.handleMessage(message, sender, sendResponse).catch((error) => {
          logger.error('Error in handleMessage for SOLVE_CAPTCHA', {
            error: error instanceof Error ? error.message : 'Unknown error',
            messageType: message.type,
          });
          
          // Send error via tabs.sendMessage as fallback
          if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: MessageType.CAPTCHA_SOLVED,
              result: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              timestamp: Date.now(),
            } as ExtensionMessage).catch(() => {
              // Ignore errors
            });
          }
        });
        
        return false; // Don't keep channel open, we use tabs.sendMessage
      }
      
      // For other messages, handle synchronously or with short timeout
      this.handleMessage(message, sender, sendResponse).catch((error) => {
        logger.error('Error in handleMessage', {
          error: error instanceof Error ? error.message : 'Unknown error',
          messageType: message.type,
        });
        // Ensure sendResponse is called even on error
        try {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } catch (e) {
          // sendResponse may have already been called or channel closed
          logger.debug('sendResponse already called or channel closed', {
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      });
      
      // For non-SOLVE_CAPTCHA messages, return true to keep channel open (SOLVE_CAPTCHA already returned above)
      return true;
    });

    // Listen for configuration changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.extension_config) {
        const newConfig = changes.extension_config.newValue as import('../shared/types/config.types').ExtensionConfig | undefined;
        if (newConfig?.apiConfig) {
          // Decrypt API key if encrypted (when received from storage.onChanged, it may be encrypted)
          const apiConfig = { ...newConfig.apiConfig };
          if (apiConfig.apiKey && isEncrypted(apiConfig.apiKey)) {
            apiConfig.apiKey = decryptApiKey(apiConfig.apiKey);
          }
          this.solverAPI = new SolverAPI(apiConfig);
        }
        logger.setEnabled(newConfig?.advanced?.enableLogging || false);
        logger.info('Service worker configuration updated');
      }
    });

    // Start periodic cache cleanup
    startCacheCleanup(5 * 60 * 1000); // Every 5 minutes
  }

  private async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    let responseSent = false;
    const safeSendResponse = (response: MessageResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (error) {
          logger.debug('Error sending response (channel may be closed)', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    try {
      switch (message.type) {
        case MessageType.SOLVE_CAPTCHA:
          await this.handleSolveCaptcha(message, sender, safeSendResponse);
          break;
        case MessageType.GET_CONFIG:
          await this.handleGetConfig(safeSendResponse);
          break;
        case MessageType.UPDATE_CONFIG:
          await this.handleUpdateConfig(message, safeSendResponse);
          break;
        case MessageType.GET_STATISTICS:
          await this.handleGetStatistics(safeSendResponse);
          break;
        case MessageType.RESET_STATISTICS:
          await this.handleResetStatistics(safeSendResponse);
          break;
        case MessageType.CAPTCHA_DETECTED:
          this.handleCaptchaDetected(message);
          safeSendResponse({ success: true });
          break;
        case MessageType.CAPTCHA_SOLVED:
          this.handleCaptchaSolved(message);
          safeSendResponse({ success: true });
          break;
        default:
          safeSendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      logger.error('Unexpected error in handleMessage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageType: message.type,
      });
      safeSendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleSolveCaptcha(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    let responseSent = false;
    const safeSendResponse = (response: MessageResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
          logger.debug('Response sent successfully', { success: response.success });
        } catch (error) {
          logger.debug('Error sending response in handleSolveCaptcha (channel may be closed)', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // If sendResponse fails, try to send via tabs.sendMessage as fallback
          if (sender.tab?.id) {
            try {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: MessageType.CAPTCHA_SOLVED,
                result: response.data || { success: response.success, error: response.error },
                timestamp: Date.now(),
              } as ExtensionMessage).catch(() => {
                // Ignore errors in fallback
              });
            } catch (e) {
              // Ignore errors
            }
          }
        }
      }
    };
    
    if (message.type !== MessageType.SOLVE_CAPTCHA) {
      safeSendResponse({ success: false, error: 'Invalid message type' });
      return;
    }

    if (!this.solverAPI) {
      safeSendResponse({ success: false, error: 'Solver API not initialized' });
      return;
    }

    const { detection } = message;

    try {
      // Get current tab URL - prefer sender.tab.url as it's more reliable
      let pageUrl = sender.tab?.url || '';
      
      // Fallback to active tab if sender.tab.url is not available
      if (!pageUrl) {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          pageUrl = tabs[0]?.url || '';
        } catch {
          // Ignore error, use empty string
        }
      }
      
      // If still no URL, try to get from sender URL
      if (!pageUrl && sender.url) {
        pageUrl = sender.url;
      }

      // Build solve request
      const request: SolveRequest = {
        type: detection.type,
        siteKey: detection.siteKey || '',
        pageUrl,
      };

      // Add type-specific parameters
      if (detection.type === CaptchaType.RECAPTCHA_V3) {
        request.action = 'verify';
      }

      // Add image data for image CAPTCHA
      if (detection.type === CaptchaType.IMAGE_CAPTCHA && detection.imageBase64) {
        request.imageBase64 = detection.imageBase64;
      }

      console.log('[CAPTCHA Solver] [Background] ===== STARTING CAPTCHA SOLVE =====');
      console.log('[CAPTCHA Solver] [Background] Detection:', {
        type: detection.type,
        siteKey: detection.siteKey?.substring(0, 10) + '...',
        pageUrl: pageUrl.substring(0, 50) + '...',
        hasImage: !!detection.imageBase64,
      });
      console.log('[CAPTCHA Solver] [Background] SolverAPI initialized:', !!this.solverAPI);
      
      logger.info('Solving CAPTCHA', {
        type: detection.type,
        siteKey: detection.siteKey,
        pageUrl,
      });

      // Check cache first
      if (detection.siteKey) {
        const cachedToken = await CacheAPI.getCachedSolution(
          detection.type,
          detection.siteKey,
          pageUrl
        );

        if (cachedToken) {
          logger.info('Skipping - recently solved (cache)', {
            type: detection.type,
            siteKey: detection.siteKey,
          });

          // For local solving, server handles everything - no token injection needed
          await this.updateStatistics(detection.type, true);

          safeSendResponse({
            success: true,
            data: {
              success: true,
              token: cachedToken,
              captchaType: detection.type,
              timestamp: Date.now(),
            },
          });
          return;
        }
      }

      // Solve CAPTCHA through queue (with rate limiting)
      console.log('[CAPTCHA Solver] [Background] Sending request to solver API...');
      console.log('[CAPTCHA Solver] [Background] Request details:', {
        type: request.type,
        siteKey: request.siteKey?.substring(0, 10) + '...',
        pageUrl: request.pageUrl?.substring(0, 50) + '...',
        endpoint: this.solverAPI?.['config']?.endpoint || 'unknown',
        timeout: this.solverAPI?.['config']?.timeout || 'unknown',
      });
      const startTime = Date.now();
      
      const result = await measurePerformance('solve-captcha', () =>
        this.requestQueue.enqueue(
          () => {
            console.log('[CAPTCHA Solver] [Background] Calling solverAPI.solve()...');
            console.log('[CAPTCHA Solver] [Background] SolverAPI config:', {
              provider: this.solverAPI?.['config']?.provider,
              endpoint: this.solverAPI?.['config']?.endpoint,
              timeout: this.solverAPI?.['config']?.timeout,
              hasApiKey: !!this.solverAPI?.['config']?.apiKey,
            });
            return this.solverAPI!.solve(request);
          },
          detection.type === CaptchaType.RECAPTCHA_V3 ? 1 : 0 // Higher priority for v3
        )
      );

      const duration = Date.now() - startTime;
      console.log(`[CAPTCHA Solver] [Background] Solver API response received (took ${duration}ms):`, {
        success: result.success,
        hasToken: !!result.token,
        tokenLength: result.token?.length || 0,
        error: result.error,
        type: detection.type,
      });

      logger.debug('Solver API response', {
        success: result.success,
        hasToken: !!result.token,
        tokenLength: result.token?.length || 0,
        error: result.error,
        type: detection.type,
        duration,
      });

      if (result.success) {
        logger.info('CAPTCHA solved successfully locally by server', {
          type: detection.type,
          hasToken: !!result.token,
          tokenLength: result.token?.length || 0,
        });
        
        // If server returned a token, inject it into the user's page
        // Server solved CAPTCHA in its own Puppeteer browser and returned the token
        // We need to inject this token into the user's browser page
        console.log('[CAPTCHA Solver] [Background] Checking for token in result:', {
          hasToken: !!result.token,
          tokenLength: result.token?.length || 0,
          success: result.success,
        });
        
        if (result.token && result.token.length > 0) {
          console.log('[CAPTCHA Solver] [Background] ✓ Token received from server, injecting...');
          logger.info('Injecting token into page', {
            type: detection.type,
            tokenLength: result.token.length,
          });
          await this.injectToken(detection, result.token);
        } else {
          console.warn('[CAPTCHA Solver] [Background] ✗ Server did not return token!', {
            success: result.success,
            error: result.error,
          });
          logger.warn('Server solved CAPTCHA but did not return token', {
            type: detection.type,
            success: result.success,
            error: result.error,
          });
        }

        // Update statistics
        await this.updateStatistics(detection.type, true);

        // Send success notification
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: MessageType.CAPTCHA_SOLVED,
              result: {
                success: true,
                captchaType: detection.type,
                timestamp: Date.now(),
              } as CaptchaSolveResult,
              timestamp: Date.now(),
            } as ExtensionMessage);
          }
        });

        // Show browser notification
        const config = await StorageAPI.getConfig();
        if (config.advanced.enableLogging) {
          await showCaptchaSolvedNotification(detection.type);
        }

        // Return response with token info for debugging
        console.log('[CAPTCHA Solver] [Background] Sending success response to content script', {
          hasToken: !!result.token,
          tokenLength: result.token?.length || 0,
        });
        
        // Result already sent via tabs.sendMessage above, but also try sendResponse as fallback
        try {
          safeSendResponse({
            success: true,
            data: {
              success: true,
              captchaType: detection.type,
              token: result.token, // Include token in response for content script
              timestamp: Date.now(),
            },
          });
        } catch (e) {
          // sendResponse may fail if channel closed, but we already sent via tabs.sendMessage
          logger.debug('sendResponse failed but result already sent via tabs.sendMessage');
        }
      } else {
        const errorMessage = result.error || 'Failed to solve CAPTCHA';
        
        // Send error via tabs.sendMessage
        if (sender.tab?.id) {
          try {
            await chrome.tabs.sendMessage(sender.tab.id, {
              type: MessageType.CAPTCHA_SOLVED,
              result: {
                success: false,
                error: errorMessage,
                captchaType: detection.type,
                timestamp: Date.now(),
              },
              timestamp: Date.now(),
            } as ExtensionMessage);
            logger.info('Error result sent via tabs.sendMessage', {
              type: detection.type,
              error: errorMessage,
            });
          } catch (error) {
            logger.warn('Failed to send error via tabs.sendMessage', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        logger.error('Failed to solve CAPTCHA', {
          type: detection.type,
          error: errorMessage,
          success: result.success,
          hasToken: !!result.token,
          siteKey: detection.siteKey,
          pageUrl,
        });
        await this.updateStatistics(detection.type, false);
        
        // Show error notification
        const config = await StorageAPI.getConfig();
        if (config.advanced.enableLogging) {
          await showErrorNotification(errorMessage);
        }
        
        safeSendResponse({
          success: false,
          error: errorMessage,
        });
      }
    } catch (error) {
      logger.error('Error in handleSolveCaptcha', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: detection.type,
      });
      await this.updateStatistics(detection.type, false);
      safeSendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async injectToken(
    detection: import('../shared/types/captcha.types').CaptchaDetectionResult,
    token: string
  ): Promise<void> {
    // Send message to content script to inject the token
    // Try to find the tab that sent the original message first
    let targetTabId: number | undefined;
    
    // First, try to get all tabs and find the one with matching URL
    try {
      // Try to find tab by URL pattern (if we have pageUrl from detection)
      // For now, use active tab as fallback
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTabId = activeTabs[0]?.id;
      
      // Also try to find by URL if available
      if (detection.siteKey) {
        // Try to match by siteKey or other criteria
        // For now, use active tab
      }
    } catch (error) {
      logger.warn('Error querying tabs for token injection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    if (targetTabId) {
      try {
        console.log('[CAPTCHA Solver] [Background] Sending INJECT_TOKEN message to tab', {
          tabId: targetTabId,
          type: detection.type,
          tokenLength: token.length,
        });
        logger.info('Sending INJECT_TOKEN message to tab', { tabId: targetTabId });
        await chrome.tabs.sendMessage(targetTabId, {
          type: MessageType.INJECT_TOKEN,
          detection,
          token,
          timestamp: Date.now(),
        } as ExtensionMessage);
        console.log('[CAPTCHA Solver] [Background] ✓ INJECT_TOKEN message sent successfully');
        logger.info('INJECT_TOKEN message sent successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error injecting token', {
          error: errorMessage,
          tabId: targetTabId,
        });
        
        // If sendMessage fails, try broadcasting to all tabs
        logger.info('Trying to broadcast token to all tabs');
        try {
          const allTabs = await chrome.tabs.query({});
          for (const tab of allTabs) {
            if (tab.id) {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  type: MessageType.INJECT_TOKEN,
                  detection,
                  token,
                  timestamp: Date.now(),
                } as ExtensionMessage);
                logger.info('Token injected via broadcast', { tabId: tab.id });
                break; // Stop after first successful injection
              } catch {
                // Continue to next tab
              }
            }
          }
        } catch (broadcastError) {
          logger.error('Broadcast injection also failed', {
            error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
          });
        }
      }
    } else {
      logger.error('No target tab found for token injection');
    }
  }

  private async handleGetConfig(sendResponse: (response: MessageResponse) => void): Promise<void> {
    const config = await StorageAPI.getConfig();
    sendResponse({ success: true, data: config });
  }

  private async handleUpdateConfig(
    message: ExtensionMessage,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    if (message.type !== MessageType.UPDATE_CONFIG) {
      sendResponse({ success: false, error: 'Invalid message type' });
      return;
    }

    await StorageAPI.updateConfig(message.config);
    sendResponse({ success: true });
  }

  private async handleGetStatistics(sendResponse: (response: MessageResponse) => void): Promise<void> {
    const stats = await StorageAPI.getStatistics();
    sendResponse({ success: true, data: stats });
  }

  private async handleResetStatistics(sendResponse: (response: MessageResponse) => void): Promise<void> {
    await StorageAPI.resetStatistics();
    sendResponse({ success: true });
  }

  private handleCaptchaDetected(message: ExtensionMessage): void {
    // Log detection if logging is enabled
    const config = StorageAPI.getConfig();
    config.then((cfg) => {
      if (cfg.advanced.enableLogging) {
        logger.info('CAPTCHA detected', { message });
      }
    });
  }

  private handleCaptchaSolved(message: ExtensionMessage): void {
    // Log solution if logging is enabled
    const config = StorageAPI.getConfig();
    config.then((cfg) => {
      if (cfg.advanced.enableLogging) {
        logger.info('CAPTCHA solved', { message });
      }
    });
  }

  private async updateStatistics(type: CaptchaType, success: boolean): Promise<void> {
    await StorageAPI.updateStatistics((stats) => {
      const updated = { ...stats };
      if (success) {
        updated.totalSolved += 1;
        updated.byType[type] = (updated.byType[type] || 0) + 1;
        updated.lastSolved = new Date();
      } else {
        updated.errors += 1;
      }
      return updated;
    });
  }
}

// Initialize service worker
new ServiceWorker();
