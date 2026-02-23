/**
 * DOM Utils Tests
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  waitForElement,
  isElementVisible,
  getElementCenter,
  getSiteKey,
  matchesUrlPattern,
} from '../../../src/shared/utils/dom-utils';

describe('DOM Utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('waitForElement', () => {
    it('should return element if it exists', async () => {
      const element = document.createElement('div');
      element.id = 'test-element';
      document.body.appendChild(element);

      const result = await waitForElement('#test-element');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-element');
    });

    it('should wait for element to appear', async () => {
      const promise = waitForElement('#delayed-element', 1000);

      setTimeout(() => {
        const element = document.createElement('div');
        element.id = 'delayed-element';
        document.body.appendChild(element);
      }, 100);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.id).toBe('delayed-element');
    });

    it('should return null on timeout', async () => {
      const result = await waitForElement('#nonexistent', 100);

      expect(result).toBeNull();
    });
  });

  describe('isElementVisible', () => {
    it('should return true for visible element', () => {
      const element = document.createElement('div');
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.width = '100px';
      element.style.height = '100px';
      element.style.position = 'absolute';
      document.body.appendChild(element);

      // Mock getBoundingClientRect for jsdom
      element.getBoundingClientRect = vi.fn(() => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      }));

      expect(isElementVisible(element)).toBe(true);
    });

    it('should return false for hidden element', () => {
      const element = document.createElement('div');
      element.style.display = 'none';
      document.body.appendChild(element);

      expect(isElementVisible(element)).toBe(false);
    });

    it('should return false for element with zero dimensions', () => {
      const element = document.createElement('div');
      element.style.width = '0px';
      element.style.height = '0px';
      document.body.appendChild(element);

      expect(isElementVisible(element)).toBe(false);
    });
  });

  describe('getElementCenter', () => {
    it('should calculate center coordinates', () => {
      const element = document.createElement('div');
      element.style.width = '100px';
      element.style.height = '100px';
      element.style.position = 'absolute';
      element.style.left = '50px';
      element.style.top = '50px';
      document.body.appendChild(element);

      // Mock getBoundingClientRect for jsdom
      element.getBoundingClientRect = vi.fn(() => ({
        width: 100,
        height: 100,
        top: 50,
        left: 50,
        right: 150,
        bottom: 150,
        x: 50,
        y: 50,
        toJSON: vi.fn(),
      }));

      const center = getElementCenter(element);

      expect(center.x).toBe(100); // 50 + 100/2
      expect(center.y).toBe(100); // 50 + 100/2
    });
  });

  describe('getSiteKey', () => {
    it('should extract site key from data-sitekey', () => {
      const element = document.createElement('div');
      element.setAttribute('data-sitekey', 'test-key-123');

      expect(getSiteKey(element)).toBe('test-key-123');
    });

    it('should extract site key from data-site-key', () => {
      const element = document.createElement('div');
      element.setAttribute('data-site-key', 'test-key-456');

      expect(getSiteKey(element)).toBe('test-key-456');
    });

    it('should return null if no site key found', () => {
      const element = document.createElement('div');

      expect(getSiteKey(element)).toBeNull();
    });
  });

  describe('matchesUrlPattern', () => {
    it('should match simple pattern', () => {
      expect(matchesUrlPattern('https://example.com', 'example.com')).toBe(true);
    });

    it('should match wildcard pattern', () => {
      expect(matchesUrlPattern('https://example.com/page', 'example.com/*')).toBe(true);
    });

    it('should not match different domain', () => {
      expect(matchesUrlPattern('https://example.com', 'other.com')).toBe(false);
    });
  });
});
