/**
 * Memory Management Utilities
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { detectionCache } from './detection-cache';
import { intervalManager } from './interval-manager';

let cleanupIntervalId: string | null = null;

/**
 * Clean up expired cache entries periodically
 */
export function startCacheCleanup(intervalMs: number = 5 * 60 * 1000): () => void {
  // Stop existing cleanup if any
  if (cleanupIntervalId) {
    intervalManager.clearInterval(cleanupIntervalId);
  }

  cleanupIntervalId = 'cache-cleanup';
  
  intervalManager.setInterval(cleanupIntervalId, () => {
    try {
      // Clean expired entries from detection cache
      if (detectionCache && detectionCache.cleanExpired) {
        detectionCache.cleanExpired();
      }

      // Force garbage collection hint (if available)
      if (globalThis.gc) {
        globalThis.gc();
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    if (cleanupIntervalId) {
      intervalManager.clearInterval(cleanupIntervalId);
      cleanupIntervalId = null;
    }
  };
}

/**
 * Get memory usage estimate (if available)
 */
export function getMemoryUsage(): {
  used?: number;
  total?: number;
  limit?: number;
} {
  if ('memory' in performance) {
    const memory = (performance as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } }).memory;
    if (memory) {
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
  }
  return {};
}
