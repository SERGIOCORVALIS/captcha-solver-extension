/**
 * Test Setup
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: vi.fn((_keys, callback) => {
        callback({});
      }),
      set: vi.fn((_items, callback) => {
        if (callback) callback();
      }),
      remove: vi.fn((_keys, callback) => {
        if (callback) callback();
      }),
    },
    local: {
      get: vi.fn((_keys, callback) => {
        callback({});
      }),
      set: vi.fn((_items, callback) => {
        if (callback) callback();
      }),
      remove: vi.fn((_keys, callback) => {
        if (callback) callback();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    id: 'test-extension-id',
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    openOptionsPage: vi.fn(),
    getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
  },
  tabs: {
    query: vi.fn((_queryInfo, callback) => {
      if (callback) {
        callback([{ id: 1, url: 'https://example.com' }]);
      }
      return Promise.resolve([{ id: 1, url: 'https://example.com' }]);
    }),
    sendMessage: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
    getAll: vi.fn(),
    clear: vi.fn(),
  },
} as unknown as typeof chrome;

// Mock window object
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com',
  },
  writable: true,
});
