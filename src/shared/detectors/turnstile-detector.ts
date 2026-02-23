/**
 * Cloudflare Turnstile Detector
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { BaseDetector } from './base-detector';
import { CaptchaType, CaptchaDetectionResult } from '../types/captcha.types';
import { TURNSTILE_SELECTORS, CAPTCHA_DOMAINS } from '../constants/captcha-selectors';

export class TurnstileDetector extends BaseDetector {
  protected readonly captchaType = CaptchaType.TURNSTILE;
  protected readonly selectors = [
    TURNSTILE_SELECTORS.widget,
    TURNSTILE_SELECTORS.iframe,
  ];
  protected readonly domains = CAPTCHA_DOMAINS.turnstile;

  async detect(): Promise<CaptchaDetectionResult | null> {
    if (!this.isApplicable()) {
      return null;
    }

    // Check for turnstile global object
    const hasTurnstile =
      typeof window !== 'undefined' &&
      (window as unknown as { turnstile?: unknown }).turnstile !== undefined;

    const widget = this.findElement(TURNSTILE_SELECTORS.widget);
    const iframe = this.findIframeByDomain('challenges.cloudflare.com');

    if (!hasTurnstile && !widget && !iframe) {
      return null;
    }

    const elementsFound = [hasTurnstile, widget, iframe].filter(Boolean).length;
    const confidence = this.calculateConfidence(elementsFound, 3);

    let siteKey: string | null = null;
    if (widget) {
      siteKey = this.getSiteKey(widget);
    }

    return {
      type: CaptchaType.TURNSTILE,
      siteKey: siteKey || undefined,
      element: widget || null,
      iframe: iframe || null,
      confidence,
      metadata: {
        hasTurnstile,
        hasWidget: !!widget,
        hasIframe: !!iframe,
      },
    };
  }
}
