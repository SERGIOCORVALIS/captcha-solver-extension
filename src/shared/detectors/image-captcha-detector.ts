/**
 * Image CAPTCHA Detector
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { BaseDetector } from "./base-detector";
import { CaptchaType, CaptchaDetectionResult } from "../types/captcha.types";
import { IMAGE_CAPTCHA_SELECTORS } from "../constants/captcha-selectors";

export class ImageCaptchaDetector extends BaseDetector {
  protected readonly captchaType = CaptchaType.IMAGE_CAPTCHA;
  protected readonly selectors = [
    IMAGE_CAPTCHA_SELECTORS.image,
    IMAGE_CAPTCHA_SELECTORS.input,
    IMAGE_CAPTCHA_SELECTORS.container,
  ];
  protected readonly domains: readonly string[] = [];

  async detect(): Promise<CaptchaDetectionResult | null> {
    // Skip if reCAPTCHA, hCaptcha, or Turnstile are present (they have priority)
    // Check for known CAPTCHA types first to avoid false positives
    const hasRecaptcha = document.querySelector(
      '.g-recaptcha, [data-sitekey], .recaptcha-checkbox, iframe[src*="recaptcha"]',
    );
    const hasHcaptcha = document.querySelector(
      '.h-captcha, .hcaptcha-box, iframe[src*="hcaptcha"]',
    );
    const hasTurnstile = document.querySelector(
      '.cf-turnstile, iframe[src*="challenges.cloudflare.com"]',
    );

    if (hasRecaptcha || hasHcaptcha || hasTurnstile) {
      return null; // Let other detectors handle these
    }

    if (!this.isApplicable()) {
      return null;
    }

    const image = this.findElement(IMAGE_CAPTCHA_SELECTORS.image);
    const input = this.findElement(IMAGE_CAPTCHA_SELECTORS.input);
    const container = this.findElement(IMAGE_CAPTCHA_SELECTORS.container);

    if (!image && !input && !container) {
      return null;
    }

    // Additional check: verify image has captcha-like attributes
    // Must be a standalone image CAPTCHA, not part of reCAPTCHA/hCaptcha
    let isCaptchaImage = false;
    if (image) {
      const alt = image.getAttribute("alt")?.toLowerCase() || "";
      const src = image.getAttribute("src")?.toLowerCase() || "";
      const className = image.classList.toString().toLowerCase();
      const id = image.getAttribute("id")?.toLowerCase() || "";

      // Exclude reCAPTCHA/hCaptcha images
      if (
        src.includes("recaptcha") ||
        src.includes("hcaptcha") ||
        src.includes("gstatic.com") ||
        className.includes("recaptcha") ||
        className.includes("hcaptcha")
      ) {
        return null;
      }

      // Check if it's a captcha image by various indicators
      isCaptchaImage =
        alt.includes("captcha") ||
        alt.includes("verification") ||
        alt.includes("security") ||
        src.includes("captcha") ||
        src.includes("verify") ||
        className.includes("captcha") ||
        className.includes("verify") ||
        id.includes("captcha") ||
        id.includes("verify");

      // Also check if image is near a captcha input field (strong indicator)
      if (!isCaptchaImage && input) {
        const imageRect = image.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        const distance =
          Math.abs(imageRect.top - inputRect.top) +
          Math.abs(imageRect.left - inputRect.left);
        if (distance < 300) {
          // Within 300px
          isCaptchaImage = true;
        }
      }
    }

    // If we have an input with captcha-related attributes, it's likely a captcha even without image
    const inputElement = input as HTMLInputElement | null;
    const hasCaptchaInput =
      inputElement &&
      (inputElement.name?.toLowerCase().includes("captcha") ||
        inputElement.id?.toLowerCase().includes("captcha") ||
        inputElement.name?.toLowerCase().includes("code") ||
        inputElement.id?.toLowerCase().includes("code") ||
        inputElement.name?.toLowerCase().includes("verify") ||
        inputElement.id?.toLowerCase().includes("verify"));

    if (!isCaptchaImage && !hasCaptchaInput && !container) {
      return null;
    }

    const elementsFound = [image, input, container].filter(Boolean).length;
    const confidence =
      this.calculateConfidence(elementsFound, 3) * (isCaptchaImage ? 1 : 0.7);

    return {
      type: CaptchaType.IMAGE_CAPTCHA,
      element: container || image || input || null,
      iframe: null,
      confidence,
      metadata: {
        hasImage: !!image,
        hasInput: !!input,
        isCaptchaImage,
      },
    };
  }
}
