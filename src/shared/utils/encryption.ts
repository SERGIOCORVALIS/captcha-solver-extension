/**
 * Simple Encryption Utility for API Keys
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 *
 * Note: This is a simple obfuscation, not true encryption.
 * For production, consider using Web Crypto API or external encryption service.
 */

/**
 * Simple XOR encryption/decryption
 */
function xorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return btoa(result); // Base64 encode
}

function xorDecrypt(encrypted: string, key: string): string {
  try {
    const text = atob(encrypted); // Base64 decode
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * Get encryption key from extension ID
 */
function getEncryptionKey(): string {
  // Use extension ID as part of key
  const extensionId = chrome.runtime.id || "default-key";
  // Add some entropy
  return `${extensionId}-captcha-solver-2024`;
}

/**
 * Encrypt API key
 */
export function encryptApiKey(apiKey: string): string {
  if (!apiKey) {
    return "";
  }
  return xorEncrypt(apiKey, getEncryptionKey());
}

/**
 * Decrypt API key
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) {
    return "";
  }
  return xorDecrypt(encryptedKey, getEncryptionKey());
}

/**
 * Check if string is encrypted (simple heuristic)
 */
export function isEncrypted(text: string): boolean {
  // Encrypted strings are base64 encoded
  try {
    atob(text);
    return text.length > 0 && /^[A-Za-z0-9+/=]+$/.test(text);
  } catch {
    return false;
  }
}
