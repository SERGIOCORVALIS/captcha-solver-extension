/**
 * Request Batcher - Batch multiple requests together for better performance
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { logger } from '../utils/logger';

export interface BatchedRequest<T> {
  request: T;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export interface BatcherOptions {
  batchSize?: number;
  batchDelay?: number; // Delay before sending batch (ms)
  maxWaitTime?: number; // Max time to wait for batch (ms)
}

export class RequestBatcher<TRequest, TResponse> {
  private queue: BatchedRequest<TRequest>[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly batchSize: number;
  private readonly batchDelay: number;
  private readonly maxWaitTime: number;
  private sendBatch: (requests: TRequest[]) => Promise<TResponse[]>;

  constructor(
    sendBatch: (requests: TRequest[]) => Promise<TResponse[]>,
    options: BatcherOptions = {}
  ) {
    this.sendBatch = sendBatch;
    this.batchSize = options.batchSize || 5;
    this.batchDelay = options.batchDelay || 100; // 100ms default
    this.maxWaitTime = options.maxWaitTime || 1000; // 1 second max wait
  }

  /**
   * Add a request to the batch queue
   */
  async add(request: TRequest): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const batchedRequest: BatchedRequest<TRequest> = {
        request,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(batchedRequest);

      // Check if batch is full
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        // Start timer for batch delay
        this.timer = setTimeout(() => {
          this.flush();
        }, this.batchDelay);
      }

      // Check for stale requests
      this.checkStaleRequests();
    });
  }

  /**
   * Flush the batch queue
   */
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    // Get batch
    const batch = this.queue.splice(0, this.batchSize);
    const requests = batch.map((b) => b.request);

    try {
      // Send batch
      const responses = await this.sendBatch(requests);

      // Resolve all promises
      batch.forEach((item, index) => {
        if (responses[index] !== undefined) {
          item.resolve(responses[index]);
        } else {
          item.reject(new Error('No response received for request'));
        }
      });
    } catch (error) {
      // Reject all promises
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      batch.forEach((item) => {
        item.reject(new Error(errorMessage));
      });
    }
  }

  /**
   * Check for stale requests and flush if needed
   */
  private checkStaleRequests(): void {
    const now = Date.now();
    const staleRequests = this.queue.filter(
      (item) => now - item.timestamp > this.maxWaitTime
    );

    if (staleRequests.length > 0) {
      logger.debug('Flushing stale requests', { count: staleRequests.length });
      this.flush();
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): { queueSize: number; batchSize: number; batchDelay: number } {
    return {
      queueSize: this.queue.length,
      batchSize: this.batchSize,
      batchDelay: this.batchDelay,
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Reject all pending requests
    this.queue.forEach((item) => {
      item.reject(new Error('Batch queue cleared'));
    });

    this.queue = [];
  }
}
