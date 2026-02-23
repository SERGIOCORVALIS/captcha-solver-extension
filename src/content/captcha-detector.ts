/**
 * CAPTCHA Detection Manager
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import {
  CaptchaDetectionResult,
  CaptchaType,
} from "../shared/types/captcha.types";
import { BaseDetector } from "../shared/detectors/base-detector";
import { logger } from "../shared/utils/logger";

// Static imports for content script to avoid chunk loading issues
// Using static imports ensures all code is bundled together
import { RecaptchaDetector } from "../shared/detectors/recaptcha-detector";
import { HCaptchaDetector } from "../shared/detectors/hcaptcha-detector";
import { TurnstileDetector } from "../shared/detectors/turnstile-detector";
import { ImageCaptchaDetector } from "../shared/detectors/image-captcha-detector";

// Detector factory - now using static imports
type DetectorFactory = () => BaseDetector;

const detectorFactories: Record<string, DetectorFactory> = {
  recaptcha: () => new RecaptchaDetector(),
  hcaptcha: () => new HCaptchaDetector(),
  turnstile: () => new TurnstileDetector(),
  image: () => new ImageCaptchaDetector(),
};

export class CaptchaDetector {
  private detectors: Map<string, BaseDetector> = new Map();
  private detectorFactories = detectorFactories;

  constructor() {
    // Detectors will be created on first use
  }

  /**
   * Get or create a detector
   */
  private getDetector(type: string): BaseDetector {
    if (this.detectors.has(type)) {
      return this.detectors.get(type)!;
    }

    const factory = this.detectorFactories[type];
    if (!factory) {
      throw new Error(`Unknown detector type: ${type}`);
    }

    const detector = factory();
    this.detectors.set(type, detector);
    return detector;
  }

  /**
   * Detect all CAPTCHAs on the page
   */
  async detectAll(): Promise<CaptchaDetectionResult[]> {
    const results: CaptchaDetectionResult[] = [];

    // Load detectors lazily
    const detectorTypes = ["recaptcha", "hcaptcha", "turnstile", "image"];

    for (const type of detectorTypes) {
      try {
        const detector = this.getDetector(type);
        const result = await detector.detect();
        if (result) {
          // Accept detections with confidence >= 0.3 (lowered from 0.5 for better detection)
          // This helps catch CAPTCHAs that load dynamically or have fewer visible elements
          if (result.confidence >= 0.3) {
            logger.debug("Adding detection to results", {
              type: result.type,
              confidence: result.confidence,
            });
            results.push(result);
          } else {
            // Log low confidence detections for debugging
            logger.debug("Low confidence detection rejected", {
              type: result.type,
              confidence: result.confidence,
              detector: type,
            });
          }
        }
      } catch (error) {
        logger.error(`Error detecting CAPTCHA with ${type}`, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Sort by confidence (highest first)
    // Also prioritize known CAPTCHA types (reCAPTCHA, hCaptcha, Turnstile) over image_captcha
    return results.sort((a, b) => {
      // Priority order: reCAPTCHA > hCaptcha > Turnstile > image_captcha
      const priority = (type: CaptchaType) => {
        if (
          type === CaptchaType.RECAPTCHA_V2 ||
          type === CaptchaType.RECAPTCHA_V3
        )
          return 4;
        if (type === CaptchaType.HCAPTCHA) return 3;
        if (type === CaptchaType.TURNSTILE) return 2;
        if (type === CaptchaType.IMAGE_CAPTCHA) return 1;
        return 0;
      };

      const priorityDiff = priority(b.type) - priority(a.type);
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by confidence
      return b.confidence - a.confidence;
    });
  }

  /**
   * Detect specific CAPTCHA type
   */
  async detectType(type: CaptchaType): Promise<CaptchaDetectionResult | null> {
    let detectorType: string | null = null;

    if (
      type === CaptchaType.RECAPTCHA_V2 ||
      type === CaptchaType.RECAPTCHA_V3
    ) {
      detectorType = "recaptcha";
    } else if (type === CaptchaType.HCAPTCHA) {
      detectorType = "hcaptcha";
    } else if (type === CaptchaType.TURNSTILE) {
      detectorType = "turnstile";
    } else if (type === CaptchaType.IMAGE_CAPTCHA) {
      detectorType = "image";
    }

    if (!detectorType) {
      return null;
    }

    try {
      const detector = this.getDetector(detectorType);
      return await detector.detect();
    } catch (error) {
      logger.error(`Error detecting ${type}`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }
}
