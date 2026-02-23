/**
 * Message Utilities
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

/**
 * Check if extension runtime is available
 * More robust check that handles edge cases
 */
export function isRuntimeAvailable(): boolean {
  try {
    // First check if chrome object exists
    if (typeof chrome === 'undefined') {
      return false;
    }
    
    // Check if runtime exists
    if (typeof chrome.runtime === 'undefined') {
      return false;
    }
    
    // Try to access runtime.id - this can throw in some contexts
    try {
      const runtimeId = chrome.runtime.id;
      // runtime.id should be a non-empty string
      return typeof runtimeId === 'string' && runtimeId.length > 0;
    } catch (e) {
      // If accessing id throws, runtime is not available
      return false;
    }
  } catch (error) {
    // Any other error means runtime is not available
    return false;
  }
}

/**
 * Check if we're in the main frame (not in iframe)
 */
export function isMainFrame(): boolean {
  try {
    return window.self === window.top;
  } catch {
    // If we can't access window.top, we're likely in a cross-origin iframe
    return false;
  }
}

/**
 * Send message to extension runtime and return Promise
 */
export function sendMessage<T = unknown>(
  message: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      // Check if runtime is available
      if (!isRuntimeAvailable()) {
        reject(new Error('Extension runtime is not available'));
        return;
      }

      chrome.runtime.sendMessage(message, (response) => {
        // Check for runtime errors
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
          // Handle extension context invalidated error gracefully
          if (errorMessage.includes('Extension context invalidated') || 
              errorMessage.includes('message port closed')) {
            reject(new Error('Extension was reloaded. Please refresh the page.'));
          } else {
            reject(new Error(errorMessage));
          }
          return;
        }
        resolve(response as T);
      });
    } catch (error) {
      // Handle extension context invalidated in catch block too
      if (error instanceof Error && 
          (error.message.includes('Extension context invalidated') ||
           error.message.includes('message port closed'))) {
        reject(new Error('Extension was reloaded. Please refresh the page.'));
      } else {
        reject(error);
      }
    }
  });
}
