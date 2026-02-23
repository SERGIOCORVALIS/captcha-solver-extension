/**
 * Request Queue for API Calls
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { RateLimiter } from './rate-limiter';

export interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
}

export class RequestQueue<T> {
  private queue: QueuedRequest<T>[] = [];
  private processing = false;
  private rateLimiter: RateLimiter;

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  /**
   * Add request to queue
   */
  async enqueue(
    execute: () => Promise<T>,
    priority = 0
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `req_${Date.now()}_${Math.random()}`,
        execute,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex((r) => r.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      this.processQueue();
    });
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Wait for rate limiter
      await this.rateLimiter.waitUntilAllowed();

      const request = this.queue.shift();
      if (!request) {
        continue;
      }

      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    this.processing = false;
  }

  /**
   * Get queue size
   */
  getSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}
