/**
 * DOM Utility Functions
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout = 10000,
  parent: Document | HTMLElement = document
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const element = parent.querySelector<HTMLElement>(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((_mutations, obs) => {
      const element = parent.querySelector<HTMLElement>(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(parent, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Wait for multiple elements to appear
 */
export function waitForElements(
  selectors: string[],
  timeout = 10000,
  parent: Document | HTMLElement = document
): Promise<HTMLElement[]> {
  return Promise.all(selectors.map((selector) => waitForElement(selector, timeout, parent))).then(
    (elements) => elements.filter((el): el is HTMLElement => el !== null)
  );
}

/**
 * Check if element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Get element's center coordinates
 */
export function getElementCenter(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * Check if URL matches pattern
 */
export function matchesUrlPattern(url: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(url);
  } catch {
    return url.includes(pattern);
  }
}

/**
 * Get site key from element
 */
export function getSiteKey(element: HTMLElement): string | null {
  return (
    element.getAttribute('data-sitekey') ||
    element.getAttribute('data-site-key') ||
    element.getAttribute('sitekey') ||
    null
  );
}
