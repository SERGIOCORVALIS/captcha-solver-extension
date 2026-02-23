/**
 * Cache API Tests
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheAPI } from '../../../src/shared/api/cache-api';
import { CaptchaType } from '../../../src/shared/types/captcha.types';

describe('CacheAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chrome.storage.local mock to return Promise
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_keys) => {
        return Promise.resolve({});
      }
    );
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
      (_items) => {
        return Promise.resolve();
      }
    );
  });

  describe('getCachedSolution', () => {
    it('should return null if no cache exists', async () => {
      const result = await CacheAPI.getCachedSolution(
        CaptchaType.RECAPTCHA_V2,
        'test-key',
        'https://example.com'
      );

      expect(result).toBeNull();
    });

    it('should return cached token if available and not expired', async () => {
      const cachedData = {
        captcha_solutions_cache: {
          'recaptcha_v2:test-key:https://example.com': {
            token: 'cached-token-123',
            timestamp: Date.now(),
            expiresAt: Date.now() + 60000, // 1 minute from now
            siteKey: 'test-key',
            pageUrl: 'https://example.com',
            type: CaptchaType.RECAPTCHA_V2,
          },
        },
      };

      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue(cachedData);

      const result = await CacheAPI.getCachedSolution(
        CaptchaType.RECAPTCHA_V2,
        'test-key',
        'https://example.com'
      );

      expect(result).toBe('cached-token-123');
    });

    it('should return null if cache is expired', async () => {
      const cachedData = {
        captcha_solutions_cache: {
          'recaptcha_v2:test-key:https://example.com': {
            token: 'expired-token',
            timestamp: Date.now() - 600000, // 10 minutes ago
            expiresAt: Date.now() - 500000, // Expired 5 minutes ago
            siteKey: 'test-key',
            pageUrl: 'https://example.com',
            type: CaptchaType.RECAPTCHA_V2,
          },
        },
      };

      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue(cachedData);

      const result = await CacheAPI.getCachedSolution(
        CaptchaType.RECAPTCHA_V2,
        'test-key',
        'https://example.com'
      );

      expect(result).toBeNull();
    });
  });

  describe('cacheSolution', () => {
    it('should cache solution with TTL', async () => {
      await CacheAPI.cacheSolution(
        CaptchaType.RECAPTCHA_V2,
        'test-key',
        'https://example.com',
        'new-token-123',
        60000
      );

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached solutions', async () => {
      await CacheAPI.clearCache();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('captcha_solutions_cache');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const cachedData = {
        captcha_solutions_cache: {
          'key1': {
            token: 'token1',
            timestamp: Date.now(),
            expiresAt: Date.now() + 60000,
            siteKey: 'key1',
            pageUrl: 'https://example.com',
            type: CaptchaType.RECAPTCHA_V2,
          },
          'key2': {
            token: 'token2',
            timestamp: Date.now() - 600000,
            expiresAt: Date.now() - 500000, // Expired
            siteKey: 'key2',
            pageUrl: 'https://example.com',
            type: CaptchaType.HCAPTCHA,
          },
        },
      };

      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue(cachedData);

      const stats = await CacheAPI.getCacheStats();

      expect(stats.total).toBe(2);
      expect(stats.expired).toBe(1);
      expect(stats.valid).toBe(1);
    });
  });
});
