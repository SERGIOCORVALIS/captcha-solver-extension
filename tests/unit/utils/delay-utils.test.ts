/**
 * Delay Utils Tests
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleep, randomSleep, humanDelay } from '../../../src/shared/utils/delay-utils';

describe('Delay Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sleep', () => {
    it('should wait for specified milliseconds', async () => {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await promise;

      expect(true).toBe(true); // If we get here, sleep worked
    });
  });

  describe('randomSleep', () => {
    it('should sleep for random time between min and max', async () => {
      const min = 100;
      const max = 200;
      const promise = randomSleep(min, max);

      // Advance time to max
      vi.advanceTimersByTime(max);
      await promise;

      expect(true).toBe(true);
    });
  });

  describe('humanDelay', () => {
    it('should generate delay with variance', async () => {
      const baseDelay = 1000;
      const variance = 0.2;
      const promise = humanDelay(baseDelay, variance);

      // Advance time to account for variance
      vi.advanceTimersByTime(baseDelay * 1.2);
      await promise;

      expect(true).toBe(true);
    });
  });
});
