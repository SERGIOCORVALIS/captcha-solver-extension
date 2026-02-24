/**␊
 * Smart Detector - Optimized detection with visibility and priority␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
export interface SmartDetectorOptions {␊
  minInterval?: number; // Minimum interval between detections (ms)␊
  debounceDelay?: number; // Debounce delay (ms)␊
  useIntersectionObserver?: boolean; // Use IntersectionObserver for visible elements␊
}␊
␊
export class SmartDetector {␊
  private lastDetection = 0;␊
  private isActive = false;␊
  private readonly minInterval: number;␊
  private readonly debounceDelay: number;␊
  private readonly useIntersectionObserver: boolean;␊
  private intersectionObserver: globalThis.IntersectionObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;␊
␊
  constructor(options: SmartDetectorOptions = {}) {␊
    this.minInterval = options.minInterval || 5000; // 5 seconds default␊
    this.debounceDelay = options.debounceDelay || 1000; // 1 second default␊
    this.useIntersectionObserver = options.useIntersectionObserver ?? true;␊
  }␊
␊
  /**␊
   * Check if detection can be performed␊
   */␊
  canDetect(): boolean {␊
    const now = Date.now();␊
    if (now - this.lastDetection < this.minInterval) {␊
      return false;␊
    }␊
    if (this.isActive) {␊
      return false;␊
    }␊
    return true;␊
  }␊
␊
  /**␊
   * Setup visibility detection using IntersectionObserver␊
   */␊
  setupVisibilityDetection(␊
    elements: HTMLElement[],␊
    callback: (element: HTMLElement) => void,
  ): void {␊
    if (!this.useIntersectionObserver || !window.IntersectionObserver) {␊
      return;␊
    }␊
␊
    // Cleanup existing observer␊
    if (this.intersectionObserver) {␊
      this.intersectionObserver.disconnect();␊
    }␊
␊
    this.intersectionObserver = new window.IntersectionObserver(
      (entries) => {␊
        entries.forEach((entry) => {␊
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {␊
            this.debouncedDetect(() => callback(entry.target as HTMLElement));␊
          }␊
        });␊
      },␊
      {␊
        root: null,␊
        rootMargin: "50px", // Detect slightly before element is visible
        threshold: 0.1, // Trigger when 10% visible␊
      },
    );␊
␊
    // Observe all elements␊
    elements.forEach((element) => {␊
      this.intersectionObserver?.observe(element);␊
    });␊
  }␊
␊
  /**␊
   * Debounced detection function␊
   */␊
  private debouncedDetect(fn: () => void): void {␊
    if (this.debounceTimer) {␊
      clearTimeout(this.debounceTimer);␊
    }␊
␊
    this.debounceTimer = setTimeout(() => {␊
      if (this.canDetect()) {␊
        fn();␊
      }␊
      this.debounceTimer = null;␊
    }, this.debounceDelay);␊
  }␊
␊
  /**␊
   * Check if element should be detected (is visible and in viewport)␊
   */␊
  shouldDetect(element: HTMLElement): boolean {␊
    const rect = element.getBoundingClientRect();␊
    const isVisible = rect.width > 0 && rect.height > 0;␊
    const isInViewport =␊
      rect.top < window.innerHeight + 100 && // 100px margin␊
      rect.bottom > -100 && // 100px margin␊
      rect.left < window.innerWidth + 100 &&␊
      rect.right > -100;␊
␊
    return isVisible && isInViewport;␊
  }␊
␊
  /**␊
   * Mark detection as started␊
   */␊
  startDetection(): void {␊
    this.isActive = true;␊
    this.lastDetection = Date.now();␊
  }␊
␊
  /**␊
   * Mark detection as finished␊
   */␊
  finishDetection(): void {␊
    this.isActive = false;␊
  }␊
␊
  /**␊
   * Cleanup resources␊
   */␊
  destroy(): void {␊
    if (this.intersectionObserver) {␊
      this.intersectionObserver.disconnect();␊
      this.intersectionObserver = null;␊
    }␊
    if (this.debounceTimer) {␊
      clearTimeout(this.debounceTimer);␊
      this.debounceTimer = null;␊
    }␊
  }␊
}␊
