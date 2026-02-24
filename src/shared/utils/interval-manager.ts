/**
 * Interval Manager - Centralized management of all intervals
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

class IntervalManager {
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Set an interval with automatic cleanup tracking
   */
  setInterval(id: string, fn: () => void, ms: number): void {
    this.clearInterval(id);
    this.intervals.set(id, setInterval(fn, ms));
  }

  /**
   * Set a timeout with automatic cleanup tracking
   */
  setTimeout(id: string, fn: () => void, ms: number): void {
    this.clearTimeout(id);
    this.timeouts.set(
      id,
      setTimeout(() => {
        fn();
        this.timeouts.delete(id);
      }, ms),
    );
  }

  /**
   * Clear a specific interval
   */
  clearInterval(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  /**
   * Clear a specific timeout
   */
  clearTimeout(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * Clear all intervals and timeouts
   */
  clearAll(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
  }

  /**
   * Get count of active intervals
   */
  getIntervalCount(): number {
    return this.intervals.size;
  }

  /**
   * Get count of active timeouts
   */
  getTimeoutCount(): number {
    return this.timeouts.size;
  }
}

// Singleton instance
export const intervalManager = new IntervalManager();
