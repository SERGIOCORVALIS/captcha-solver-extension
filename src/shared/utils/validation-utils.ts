/**␊
 * Validation Utility Functions␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
import { ExtensionConfig } from "../types/config.types";
␊
/**␊
 * Validate API key format␊
 */␊
export function isValidApiKey(apiKey: string): boolean {␊
  if (!apiKey || apiKey.trim().length === 0) {␊
    return false;␊
  }␊
  // Basic validation - at least 20 characters␊
  return apiKey.trim().length >= 20;␊
}␊
␊
/**␊
 * Validate URL pattern␊
 */␊
export function isValidUrlPattern(pattern: string): boolean {␊
  if (!pattern || pattern.trim().length === 0) {␊
    return false;␊
  }␊
  try {␊
    new RegExp(pattern.replace(/\*/g, ".*"));
    return true;␊
  } catch {␊
    return false;␊
  }␊
}␊
␊
/**␊
 * Validate extension configuration␊
 */␊
export function validateConfig(config: Partial<ExtensionConfig>): {␊
  valid: boolean;␊
  errors: string[];␊
} {␊
  const errors: string[] = [];␊
␊
  if (config.apiConfig?.apiKey && !isValidApiKey(config.apiConfig.apiKey)) {␊
    errors.push("Invalid API key format");
  }␊
␊
  if (config.advanced) {␊
    if (config.advanced.clickDelay < 0) {␊
      errors.push("Click delay must be non-negative");
    }␊
    if (config.advanced.solveDelay < 0) {␊
      errors.push("Solve delay must be non-negative");
    }␊
    if (config.advanced.retryAttempts < 0) {␊
      errors.push("Retry attempts must be non-negative");
    }␊
  }␊
␊
  if (config.whitelist) {␊
    config.whitelist.forEach((pattern, index) => {␊
      if (!isValidUrlPattern(pattern)) {␊
        errors.push(`Invalid whitelist pattern at index ${index}: ${pattern}`);␊
      }␊
    });␊
  }␊
␊
  if (config.blacklist) {␊
    config.blacklist.forEach((pattern, index) => {␊
      if (!isValidUrlPattern(pattern)) {␊
        errors.push(`Invalid blacklist pattern at index ${index}: ${pattern}`);␊
      }␊
    });␊
  }␊
␊
  return {␊
    valid: errors.length === 0,␊
    errors,␊
  };␊
}␊
