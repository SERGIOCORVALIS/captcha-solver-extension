/**␊
 * Validation Utilities␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
/**␊
 * Validate API key format␊
 */␊
export function isValidApiKey(key: string): boolean {␊
  if (!key || typeof key !== "string") {
    return false;␊
  }␊
␊
  // Basic validation: should be alphanumeric with possible dashes/underscores␊
  // Length should be reasonable (10-200 characters)␊
  const trimmed = key.trim();␊
  return (␊
    trimmed.length >= 10 &&␊
    trimmed.length <= 200 &&␊
    /^[a-zA-Z0-9_-]+$/.test(trimmed)␊
  );␊
}␊
␊
/**␊
 * Validate URL␊
 */␊
export function isValidUrl(url: string): boolean {␊
  try {␊
    const parsed = new URL(url);␊
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {␊
    return false;␊
  }␊
}␊
␊
/**␊
 * Sanitize string to prevent XSS␊
 */␊
export function sanitizeString(str: string): string {␊
  const div = document.createElement("div");
  div.textContent = str;␊
  return div.innerHTML;␊
}␊
␊
/**␊
 * Validate site key format␊
 */␊
export function isValidSiteKey(siteKey: string): boolean {␊
  if (!siteKey || typeof siteKey !== "string") {
    return false;␊
  }␊
␊
  // reCAPTCHA site keys are typically 40 characters␊
  // hCaptcha site keys are UUIDs␊
  const trimmed = siteKey.trim();␊
  return trimmed.length >= 20 && trimmed.length <= 100;␊
}␊
