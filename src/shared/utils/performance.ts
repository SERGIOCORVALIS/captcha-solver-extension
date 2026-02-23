/**
 * Performance Monitoring Utilities
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Start measuring performance
   */
  start(name: string): void {
    if (!this.enabled) {
      return;
    }

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  /**
   * End measuring performance
   */
  end(name: string): number | null {
    if (!this.enabled) {
      return null;
    }

    const metric = this.metrics.get(name);
    if (!metric) {
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    return metric.duration;
  }

  /**
   * Get metric
   */
  getMetric(name: string): PerformanceMetric | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure function execution time
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  performanceMonitor.start(name);
  try {
    const result = await fn();
    const duration = performanceMonitor.end(name);
    if (duration !== null) {
      logger.debug(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    }
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}
