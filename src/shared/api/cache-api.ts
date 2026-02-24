/**
 * CAPTCHA Solution Cache API
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { CaptchaType } from "../types/captcha.types";

export interface CachedSolution {
  token: string;
  timestamp: number;
  expiresAt: number;
  siteKey: string;
  pageUrl: string;
  type: CaptchaType;
}

const CACHE_KEY = "captcha_solutions_cache";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export class CacheAPI {
  /**
   * Generate cache key from request parameters
   */
  private static generateCacheKey(
    type: CaptchaType,
    siteKey: string,
    pageUrl: string,
  ): string {
    return `${type}:${siteKey}:${pageUrl}`;
  }

  /**
   * Get cached solution if available and not expired
   */
  static async getCachedSolution(
    type: CaptchaType,
    siteKey: string,
    pageUrl: string,
  ): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(CACHE_KEY);
      const cache =
        (result?.[CACHE_KEY] as Record<string, CachedSolution>) || {};

      const key = this.generateCacheKey(type, siteKey, pageUrl);
      const cached = cache[key];

      if (!cached) {
        return null;
      }

      // Check if expired
      if (Date.now() > cached.expiresAt) {
        // Remove expired entry
        delete cache[key];
        await chrome.storage.local.set({ [CACHE_KEY]: cache });
        return null;
      }

      return cached.token;
    } catch (error) {
      console.error("Error getting cached solution:", error);
      return null;
    }
  }

  /**
   * Cache solution with TTL
   */
  static async cacheSolution(
    type: CaptchaType,
    siteKey: string,
    pageUrl: string,
    token: string,
    ttl: number = DEFAULT_TTL,
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get(CACHE_KEY);
      const cache =
        (result?.[CACHE_KEY] as Record<string, CachedSolution>) || {};

      const key = this.generateCacheKey(type, siteKey, pageUrl);
      cache[key] = {
        token,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        siteKey,
        pageUrl,
        type,
      };

      // Clean up old entries (keep only last 100)
      const entries = Object.entries(cache);
      if (entries.length > 100) {
        // Sort by timestamp and keep newest
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const cleaned: Record<string, CachedSolution> = {};
        for (let i = 0; i < 100; i++) {
          cleaned[entries[i][0]] = entries[i][1];
        }
        await chrome.storage.local.set({ [CACHE_KEY]: cleaned });
      } else {
        await chrome.storage.local.set({ [CACHE_KEY]: cache });
      }
    } catch (error) {
      console.error("Error caching solution:", error);
    }
  }

  /**
   * Clear all cached solutions
   */
  static async clearCache(): Promise<void> {
    try {
      await chrome.storage.local.remove(CACHE_KEY);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    total: number;
    expired: number;
    valid: number;
  }> {
    try {
      const result = await chrome.storage.local.get(CACHE_KEY);
      const cache =
        (result?.[CACHE_KEY] as Record<string, CachedSolution>) || {};

      const entries = Object.values(cache);
      const now = Date.now();

      return {
        total: entries.length,
        expired: entries.filter((e) => now > e.expiresAt).length,
        valid: entries.filter((e) => now <= e.expiresAt).length,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { total: 0, expired: 0, valid: 0 };
    }
  }
}
