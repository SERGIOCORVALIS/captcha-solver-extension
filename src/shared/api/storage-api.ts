/**
 * Chrome Storage API Wrapper
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { ExtensionConfig } from "../types/config.types";
import { DEFAULT_CONFIG, STORAGE_KEYS } from "../constants/config-defaults";
import { encryptApiKey, decryptApiKey, isEncrypted } from "../utils/encryption";

export class StorageAPI {
  /**
   * Get extension configuration
   */
  static async getConfig(): Promise<ExtensionConfig> {
    return new Promise((resolve, reject) => {
      try {
        // Check if runtime is available
        if (
          typeof chrome === "undefined" ||
          !chrome.runtime ||
          !chrome.runtime.id
        ) {
          reject(new Error("Extension runtime is not available"));
          return;
        }

        chrome.storage.sync.get(STORAGE_KEYS.CONFIG, (result) => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            const errorMessage =
              chrome.runtime.lastError.message || "Unknown error";
            if (
              errorMessage.includes("Extension context invalidated") ||
              errorMessage.includes("message port closed")
            ) {
              reject(
                new Error("Extension was reloaded. Please refresh the page."),
              );
            } else {
              reject(new Error(errorMessage));
            }
            return;
          }

          if (result[STORAGE_KEYS.CONFIG]) {
            const storedConfig = result[STORAGE_KEYS.CONFIG] as ExtensionConfig;

            // Merge stored config with defaults to ensure new default values are applied
            const config: ExtensionConfig = {
              ...DEFAULT_CONFIG,
              ...storedConfig,
              captchaTypes: {
                ...DEFAULT_CONFIG.captchaTypes,
                ...storedConfig.captchaTypes,
              },
              apiConfig: {
                ...DEFAULT_CONFIG.apiConfig,
                ...storedConfig.apiConfig,
                // Auto-sync API key with default if using custom provider
                // This ensures the key always matches server/.env
                apiKey:
                  storedConfig.apiConfig?.provider === "custom" &&
                  storedConfig.apiConfig?.apiKey !==
                    DEFAULT_CONFIG.apiConfig.apiKey
                    ? DEFAULT_CONFIG.apiConfig.apiKey // Use default key for custom provider
                    : storedConfig.apiConfig?.apiKey ||
                      DEFAULT_CONFIG.apiConfig.apiKey,
                // Preserve stored API key and endpoint, but ensure timeout is at least 600 seconds (10 minutes)
                // This prevents using old shorter timeouts that cause failures
                timeout: Math.max(
                  storedConfig.apiConfig?.timeout ??
                    DEFAULT_CONFIG.apiConfig?.timeout ??
                    600000,
                  DEFAULT_CONFIG.apiConfig?.timeout ?? 600000, // Minimum 600 seconds (10 minutes)
                ),
              },
              advanced: {
                ...DEFAULT_CONFIG.advanced,
                ...storedConfig.advanced,
              },
            };

            // Decrypt API key if encrypted
            if (
              config.apiConfig?.apiKey &&
              isEncrypted(config.apiConfig.apiKey)
            ) {
              config.apiConfig.apiKey = decryptApiKey(config.apiConfig.apiKey);
            }

            resolve(config);
          } else {
            resolve(DEFAULT_CONFIG);
          }
        });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("Extension context invalidated") ||
            error.message.includes("message port closed"))
        ) {
          reject(new Error("Extension was reloaded. Please refresh the page."));
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Update extension configuration
   */
  static async updateConfig(config: Partial<ExtensionConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(STORAGE_KEYS.CONFIG, (result) => {
        const currentConfig =
          (result[STORAGE_KEYS.CONFIG] as ExtensionConfig) || DEFAULT_CONFIG;

        // Encrypt API key before storing
        const apiConfig = config.apiConfig
          ? { ...config.apiConfig }
          : currentConfig.apiConfig;
        if (apiConfig?.apiKey && !isEncrypted(apiConfig.apiKey)) {
          apiConfig.apiKey = encryptApiKey(apiConfig.apiKey);
        }

        const updatedConfig: ExtensionConfig = {
          ...currentConfig,
          ...config,
          captchaTypes: {
            ...currentConfig.captchaTypes,
            ...config.captchaTypes,
          },
          apiConfig: apiConfig || currentConfig.apiConfig,
          advanced: {
            ...currentConfig.advanced,
            ...config.advanced,
          },
        };

        chrome.storage.sync.set(
          {
            [STORAGE_KEYS.CONFIG]: updatedConfig,
            [STORAGE_KEYS.LAST_UPDATE]: Date.now(),
          },
          () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          },
        );
      });
    });
  }

  /**
   * Get statistics
   */
  static async getStatistics(): Promise<ExtensionConfig["statistics"]> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        [STORAGE_KEYS.CONFIG, STORAGE_KEYS.STATISTICS],
        (result) => {
          const config =
            (result[STORAGE_KEYS.CONFIG] as ExtensionConfig) || DEFAULT_CONFIG;
          const stats =
            (result[
              STORAGE_KEYS.STATISTICS
            ] as ExtensionConfig["statistics"]) || config.statistics;
          resolve(stats);
        },
      );
    });
  }

  /**
   * Update statistics
   */
  static async updateStatistics(
    updater: (
      stats: ExtensionConfig["statistics"],
    ) => ExtensionConfig["statistics"],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getStatistics().then((stats) => {
        const updated = updater(stats);
        chrome.storage.sync.set(
          {
            [STORAGE_KEYS.STATISTICS]: updated,
          },
          () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          },
        );
      });
    });
  }

  /**
   * Reset statistics
   */
  static async resetStatistics(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(STORAGE_KEYS.CONFIG, (result) => {
        const config =
          (result[STORAGE_KEYS.CONFIG] as ExtensionConfig) || DEFAULT_CONFIG;
        chrome.storage.sync.set(
          {
            [STORAGE_KEYS.STATISTICS]: config.statistics,
          },
          () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          },
        );
      });
    });
  }
}
