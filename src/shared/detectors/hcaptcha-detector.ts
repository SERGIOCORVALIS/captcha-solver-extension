/**
 * hCaptcha Detector
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { BaseDetector } from "./base-detector";
import { CaptchaType, CaptchaDetectionResult } from "../types/captcha.types";
import {
  HCAPTCHA_SELECTORS,
  CAPTCHA_DOMAINS,
} from "../constants/captcha-selectors";

export class HCaptchaDetector extends BaseDetector {
  protected readonly captchaType = CaptchaType.HCAPTCHA;
  protected readonly selectors = [
    HCAPTCHA_SELECTORS.checkbox,
    HCAPTCHA_SELECTORS.iframe,
    HCAPTCHA_SELECTORS.container,
  ];
  protected readonly domains = CAPTCHA_DOMAINS.hcaptcha;

  async detect(): Promise<CaptchaDetectionResult | null> {
    // Check for loaded scripts first
    if (this.hasHCaptchaScript()) {
      // Script detected, continue with detection
    } else if (!this.isApplicable()) {
      return null;
    }

    // Check for hcaptcha global object
    const hasHcaptcha =
      typeof window !== "undefined" &&
      (window as unknown as { hcaptcha?: unknown }).hcaptcha !== undefined;

    const checkbox = this.findElement(HCAPTCHA_SELECTORS.checkbox);
    const iframe = this.findIframeByDomain("hcaptcha.com");
    const container = this.findElement(HCAPTCHA_SELECTORS.container);

    if (!hasHcaptcha && !checkbox && !iframe && !container) {
      return null;
    }

    const elementsFound = [hasHcaptcha, checkbox, iframe, container].filter(
      Boolean,
    ).length;
    const confidence = this.calculateConfidence(elementsFound, 4);

    let siteKey: string | null = null;
    if (container) {
      siteKey = this.getSiteKey(container);
    }

    return {
      type: CaptchaType.HCAPTCHA,
      siteKey: siteKey || undefined,
      element: container || checkbox || null,
      iframe: iframe || null,
      confidence,
      metadata: {
        hasHcaptcha,
        hasCheckbox: !!checkbox,
        hasIframe: !!iframe,
      },
    };
  }

  /**
   * Check if hCaptcha script is loaded
   */
  private hasHCaptchaScript(): boolean {
    // Check for hcaptcha global object
    if (typeof window !== "undefined") {
      const hcaptcha = (window as unknown as { hcaptcha?: unknown }).hcaptcha;
      if (hcaptcha) {
        return true;
      }
    }

    // Check for script tags
    const scripts = document.querySelectorAll<HTMLScriptElement>("script[src]");
    for (const script of scripts) {
      const src = script.src.toLowerCase();
      if (src.includes("hcaptcha") || src.includes("js.hcaptcha.com")) {
        return true;
      }
    }

    return false;
  }
}


  
