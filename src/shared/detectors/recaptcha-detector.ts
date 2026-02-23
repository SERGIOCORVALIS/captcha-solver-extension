/**
 * reCAPTCHA Detector (v2 and v3)
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { BaseDetector } from './base-detector';
import { CaptchaType, CaptchaDetectionResult } from '../types/captcha.types';
import { RECAPTCHA_SELECTORS, CAPTCHA_DOMAINS } from '../constants/captcha-selectors';
import { logger } from '../utils/logger';

export class RecaptchaDetector extends BaseDetector {
  protected readonly captchaType = CaptchaType.RECAPTCHA_V2;
  protected readonly selectors = [
    RECAPTCHA_SELECTORS.v2.checkbox,
    RECAPTCHA_SELECTORS.v2.iframe,
    RECAPTCHA_SELECTORS.container,
    RECAPTCHA_SELECTORS.widget,
  ];
  protected readonly domains = CAPTCHA_DOMAINS.recaptcha;

  async detect(): Promise<CaptchaDetectionResult | null> {
    // Check for loaded scripts first
    const hasScript = this.hasRecaptchaScript();
    const hasIframes = this.checkIframeDomains();
    const hasSelectors = this.selectors.some((selector) => {
      try {
        return document.querySelector(selector) !== null;
      } catch {
        return false;
      }
    });
    
    console.log('[CAPTCHA Solver] reCAPTCHA detector:', {
      hasScript,
      hasIframes,
      hasSelectors,
      iframeCount: document.querySelectorAll('iframe[src*="recaptcha"]').length,
      allIframes: document.querySelectorAll('iframe').length
    });
    
    // Don't return early - reCAPTCHA might load dynamically
    // Continue detection even if script isn't loaded yet, as long as we have some indication
    if (hasScript) {
      console.log('[CAPTCHA Solver] reCAPTCHA script found, detecting...');
    } else if (hasIframes || hasSelectors) {
      console.log('[CAPTCHA Solver] reCAPTCHA indicators found (iframes/selectors), detecting even without script...');
    } else {
      // Only return null if we have absolutely no indicators
      // But still log for debugging
      console.log('[CAPTCHA Solver] No reCAPTCHA indicators found (script, iframes, or selectors)');
      // Don't return null - let detectV2/detectV3 do their own checks
    }

    // Check for reCAPTCHA v2
    const v2Result = await this.detectV2();
    if (v2Result) {
      console.log('[CAPTCHA Solver] reCAPTCHA v2 detected!', { confidence: v2Result.confidence, siteKey: v2Result.siteKey?.substring(0, 10) });
      return v2Result;
    }

    // Check for reCAPTCHA v3
    const v3Result = await this.detectV3();
    if (v3Result) {
      console.log('[CAPTCHA Solver] reCAPTCHA v3 detected!', { confidence: v3Result.confidence });
      return v3Result;
    }

    console.log('[CAPTCHA Solver] No reCAPTCHA detected');
    return null;
  }

  private async detectV2(): Promise<CaptchaDetectionResult | null> {
    const checkbox = this.findElement(RECAPTCHA_SELECTORS.v2.checkbox);
    const iframe = this.findIframeByDomain('recaptcha/api2/anchor');
    const container = this.findElement(RECAPTCHA_SELECTORS.container) ||
      this.findElement(RECAPTCHA_SELECTORS.widget);

    // Also check for data-sitekey attribute in any element (for dynamically loaded widgets)
    let siteKeyElement: Element | null = null;
    if (!container) {
      siteKeyElement = document.querySelector('[data-sitekey]');
    }
    
    // Also check for any iframe with recaptcha in src (broader search)
    // Check both src attribute and current src property
    const allIframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
    const allRecaptchaIframes: HTMLIFrameElement[] = [];
    const gstaticIframes: HTMLIFrameElement[] = [];
    const googleIframes: HTMLIFrameElement[] = [];
    
    for (const ifr of allIframes) {
      try {
        const src = ifr.src || ifr.getAttribute('src') || '';
        if (src.includes('recaptcha')) {
          allRecaptchaIframes.push(ifr);
        }
        if (src.includes('gstatic.com/recaptcha')) {
          gstaticIframes.push(ifr);
        }
        if (src.includes('google.com/recaptcha')) {
          googleIframes.push(ifr);
        }
      } catch {
        // Cross-origin iframe, skip
        continue;
      }
    }
    
    // Check for any element with recaptcha-related classes or IDs
    const recaptchaElements = document.querySelectorAll('[class*="recaptcha"], [id*="recaptcha"], [class*="g-recaptcha"]');
    
    console.log('[CAPTCHA Solver] reCAPTCHA v2 detection:', {
      hasCheckbox: !!checkbox,
      hasIframe: !!iframe,
      hasContainer: !!container,
      hasSiteKeyElement: !!siteKeyElement,
      allRecaptchaIframesCount: allRecaptchaIframes.length,
      gstaticIframesCount: gstaticIframes.length,
      googleIframesCount: googleIframes.length,
      recaptchaElementsCount: recaptchaElements.length,
    });

    // Check for grecaptcha widget IDs (for dynamically loaded widgets)
    let grecaptchaSiteKey: string | null = null;
    if (typeof window !== 'undefined') {
      const grecaptcha = (window as unknown as { grecaptcha?: { render?: (container: string | HTMLElement, params: { sitekey: string }) => number } }).grecaptcha;
      if (grecaptcha) {
        // Try to find sitekey from grecaptcha.render calls or widget data
        try {
          const widgets = document.querySelectorAll('[data-sitekey]');
          if (widgets.length > 0) {
            grecaptchaSiteKey = widgets[0].getAttribute('data-sitekey');
          }
        } catch {
          // Ignore
        }
      }
    }

    // Expanded check - include all iframe types and recaptcha elements
    const hasAnyElement = !!(
      checkbox || 
      iframe || 
      container || 
      siteKeyElement || 
      allRecaptchaIframes.length > 0 ||
      gstaticIframes.length > 0 ||
      googleIframes.length > 0 ||
      recaptchaElements.length > 0
    );
    
    if (!hasAnyElement) {
      // Log debug info if script is loaded but no elements found
      if (this.hasRecaptchaScript()) {
        console.log('[CAPTCHA Solver] reCAPTCHA script loaded but no elements found yet (may load dynamically)');
        logger.debug('Script loaded but no elements found', {
          hasGrecaptcha: typeof window !== 'undefined' && !!(window as unknown as { grecaptcha?: unknown }).grecaptcha,
          scriptCount: document.querySelectorAll('script[src*="recaptcha"]').length,
        });
      }
      return null;
    }
    
    // If we found iframes but no other elements, use the first iframe as element
    // Prioritize: container > siteKeyElement > checkbox > recaptcha iframe > gstatic iframe > google iframe > recaptcha element
    const elementToUse = container || 
      siteKeyElement || 
      checkbox || 
      (allRecaptchaIframes.length > 0 ? allRecaptchaIframes[0] as HTMLElement : null) ||
      (gstaticIframes.length > 0 ? gstaticIframes[0] as HTMLElement : null) ||
      (googleIframes.length > 0 ? googleIframes[0] as HTMLElement : null) ||
      (recaptchaElements.length > 0 ? recaptchaElements[0] as HTMLElement : null);

    // Count all found elements for confidence calculation
    const elementsFound = [
      checkbox, 
      iframe, 
      container, 
      siteKeyElement,
      allRecaptchaIframes.length > 0,
      gstaticIframes.length > 0,
      googleIframes.length > 0,
      recaptchaElements.length > 0
    ].filter(Boolean).length;
    const confidence = this.calculateConfidence(elementsFound, 8);

    let siteKey: string | null = null;
    if (container) {
      siteKey = this.getSiteKey(container as HTMLElement);
    } else if (siteKeyElement) {
      siteKey = this.getSiteKey(siteKeyElement as HTMLElement);
    } else if (grecaptchaSiteKey) {
      siteKey = grecaptchaSiteKey;
    } else if (recaptchaElements.length > 0) {
      // Try to get sitekey from recaptcha elements
      siteKey = this.getSiteKey(recaptchaElements[0] as HTMLElement);
    }

    // Use first iframe if no other element found - prioritize anchor iframe, then any recaptcha iframe
    const finalIframe = iframe || 
      (allRecaptchaIframes.length > 0 ? allRecaptchaIframes[0] as HTMLIFrameElement : null) ||
      (gstaticIframes.length > 0 ? gstaticIframes[0] as HTMLIFrameElement : null) ||
      (googleIframes.length > 0 ? googleIframes[0] as HTMLIFrameElement : null);
    
    return {
      type: CaptchaType.RECAPTCHA_V2,
      siteKey: siteKey || undefined,
      element: elementToUse as HTMLElement | null,
      iframe: finalIframe,
      confidence,
      metadata: {
        version: 'v2',
        hasCheckbox: !!checkbox,
        hasIframe: !!finalIframe,
        hasContainer: !!container,
        hasSiteKeyElement: !!siteKeyElement,
        allRecaptchaIframesCount: allRecaptchaIframes.length,
        gstaticIframesCount: gstaticIframes.length,
        googleIframesCount: googleIframes.length,
        recaptchaElementsCount: recaptchaElements.length,
      },
    };
  }

  private async detectV3(): Promise<CaptchaDetectionResult | null> {
    // Check for grecaptcha global object
    const hasGrecaptcha =
      typeof window !== 'undefined' &&
      (window as unknown as { grecaptcha?: unknown }).grecaptcha !== undefined;

    const badge = this.findElement(RECAPTCHA_SELECTORS.v3.badge);
    const iframe = this.findIframeByDomain('recaptcha/api2/webworker');
    const container = this.findElement(RECAPTCHA_SELECTORS.widget);

    if (!hasGrecaptcha && !badge && !iframe && !container) {
      return null;
    }

    const elementsFound = [hasGrecaptcha, badge, iframe, container].filter(Boolean).length;
    const confidence = this.calculateConfidence(elementsFound, 4);

    let siteKey: string | null = null;
    if (container) {
      siteKey = this.getSiteKey(container);
    }

    return {
      type: CaptchaType.RECAPTCHA_V3,
      siteKey: siteKey || undefined,
      element: container || badge || null,
      iframe: iframe || null,
      confidence,
      metadata: {
        version: 'v3',
        hasGrecaptcha,
        hasBadge: !!badge,
      },
    };
  }

  /**
   * Check if reCAPTCHA script is loaded
   */
  private hasRecaptchaScript(): boolean {
    // Check for grecaptcha global object
    if (typeof window !== 'undefined') {
      const grecaptcha = (window as unknown as { grecaptcha?: unknown }).grecaptcha;
      if (grecaptcha) {
        return true;
      }
    }

    // Check for script tags
    const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');
    for (const script of scripts) {
      const src = script.src.toLowerCase();
      if (
        src.includes('recaptcha') ||
        src.includes('gstatic.com/recaptcha') ||
        src.includes('google.com/recaptcha')
      ) {
        return true;
      }
    }

    return false;
  }
}
