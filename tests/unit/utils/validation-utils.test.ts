/**
 * Validation Utils Tests
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidApiKey,
  isValidUrlPattern,
  validateConfig,
} from '../../../src/shared/utils/validation-utils';
import { DEFAULT_CONFIG } from '../../../src/shared/constants/config-defaults';

describe('Validation Utils', () => {
  describe('isValidApiKey', () => {
    it('should return true for valid API key', () => {
      expect(isValidApiKey('a'.repeat(20))).toBe(true);
      expect(isValidApiKey('valid-api-key-12345678901234567890')).toBe(true);
    });

    it('should return false for invalid API key', () => {
      expect(isValidApiKey('')).toBe(false);
      expect(isValidApiKey('short')).toBe(false);
      expect(isValidApiKey('   ')).toBe(false);
    });
  });

  describe('isValidUrlPattern', () => {
    it('should return true for valid URL pattern', () => {
      expect(isValidUrlPattern('example.com')).toBe(true);
      expect(isValidUrlPattern('*.example.com')).toBe(true);
      expect(isValidUrlPattern('example.com/*')).toBe(true);
    });

    it('should return false for invalid pattern', () => {
      expect(isValidUrlPattern('')).toBe(false);
      expect(isValidUrlPattern('   ')).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config = { ...DEFAULT_CONFIG };
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid API key', () => {
      const config = {
        ...DEFAULT_CONFIG,
        apiConfig: {
          ...DEFAULT_CONFIG.apiConfig,
          apiKey: 'short',
        },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect negative delays', () => {
      const config = {
        ...DEFAULT_CONFIG,
        advanced: {
          ...DEFAULT_CONFIG.advanced,
          clickDelay: -100,
        },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('delay'))).toBe(true);
    });

    it('should detect invalid whitelist patterns', () => {
      const config = {
        ...DEFAULT_CONFIG,
        whitelist: ['[invalid-regex'],
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('whitelist'))).toBe(true);
    });
  });
});
