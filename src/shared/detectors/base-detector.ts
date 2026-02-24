/**
 * Base CAPTCHA Detector
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { CaptchaType, CaptchaDetectionResult } from "../types/captcha.types";

export abstract class BaseDetector {
  protected abstract readonly captchaType: CaptchaType;
  protected abstract readonly selectors: readonly string[];
  protected abstract readonly domains: readonly string[];

  /**
   * Detect if CAPTCHA is present on the page
   */
  abstract detect(): Promise<CaptchaDetectionResult | null>;

  /**
   * Check if detector is applicable for current page
   */
  protected isApplicable(): boolean {
    // Check if any selector matches
    const hasSelector = this.selectors.some((selector) => {
      try {
        return document.querySelector(selector) !== null;
      } catch {
        return false;
      }
    });

    // Check if any domain matches in iframes
    const hasDomain = this.checkIframeDomains();

    return hasSelector || hasDomain;
  }

  /**
   * Check if any iframe matches detector domains
   */
  protected checkIframeDomains(): boolean {
    const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe");
    for (const iframe of iframes) {
      try {
        const src = iframe.src;
        if (this.domains.some((domain) => src.includes(domain))) {
          return true;
        }
      } catch {
        // Cross-origin iframe, skip
        continue;
      }
    }
    return false;
  }

  /**
   * Find element by selector
   */
  protected findElement(selector: string): HTMLElement | null {
    try {
      return document.querySelector<HTMLElement>(selector);
    } catch {
      return null;
    }
  }

  /**
   * Find all elements by selector
   */
  protected findElements(selector: string): HTMLElement[] {
    try {
      return Array.from(document.querySelectorAll<HTMLElement>(selector));
    } catch {
      return [];
    }
  }

  /**
   * Find iframe by domain
   */
  protected findIframeByDomain(domain: string): HTMLIFrameElement | null {
    const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe");
    for (const iframe of iframes) {
      try {
        if (iframe.src.includes(domain)) {
          return iframe;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Calculate detection confidence (0-1)
   */
  protected calculateConfidence(
    elementsFound: number,
    totalSelectors: number,
  ): number {
    return Math.min(elementsFound / totalSelectors, 1);
  }

  /**
   * Get site key from element
   */
  protected getSiteKey(element: HTMLElement): string | null {
    return (
      element.getAttribute("data-sitekey") ||
      element.getAttribute("data-site-key") ||
      element.getAttribute("sitekey") ||
      null
    );
  }
}
