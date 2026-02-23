/**
 * Detection Cache Utility with LRU (Least Recently Used) strategy
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { CaptchaDetectionResult } from '../types/captcha.types';

interface CachedDetection {
  detection: CaptchaDetectionResult;
  timestamp: number;
  expiresAt: number;
  lastAccessed: number; // For LRU tracking
}

class DetectionCache {
  private cache = new Map<string, CachedDetection>();
  private readonly TTL = 30 * 1000; // 30 seconds
  private readonly MAX_SIZE = 50;

  /**
   * Generate cache key from page URL and site key
   */
  private getKey(pageUrl: string, siteKey?: string): string {
    return `${pageUrl}:${siteKey || 'none'}`;
  }

  /**
   * Get cached detection (LRU: update access time)
   */
  get(pageUrl: string, siteKey?: string): CaptchaDetectionResult[] | null {
    const key = this.getKey(pageUrl, siteKey);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update last accessed time for LRU
    cached.lastAccessed = Date.now();
    this.cache.set(key, cached);

    return [cached.detection];
  }

  /**
   * Cache detection (LRU: remove oldest if cache is full)
   */
  set(
    pageUrl: string,
    detections: CaptchaDetectionResult[],
    siteKey?: string
  ): void {
    if (detections.length === 0) {
      return;
    }

    // Cache first detection (most common case)
    const detection = detections[0];
    const key = this.getKey(pageUrl, detection.siteKey || siteKey);

    // LRU: Remove oldest entry if cache is too large
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      // Find oldest entry by lastAccessed time
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.cache.set(key, {
      detection,
      timestamp: now,
      expiresAt: now + this.TTL,
      lastAccessed: now,
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      ttl: this.TTL,
    };
  }
}

export const detectionCache = new DetectionCache();
