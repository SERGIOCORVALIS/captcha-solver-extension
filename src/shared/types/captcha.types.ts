/**
 * CAPTCHA Types and Interfaces
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

export enum CaptchaType {
  RECAPTCHA_V2 = 'recaptcha_v2',
  RECAPTCHA_V3 = 'recaptcha_v3',
  HCAPTCHA = 'hcaptcha',
  TURNSTILE = 'turnstile',
  IMAGE_CAPTCHA = 'image_captcha',
  UNKNOWN = 'unknown',
}

export interface CaptchaDetectionResult {
  type: CaptchaType;
  siteKey?: string;
  element: HTMLElement | null;
  iframe?: HTMLIFrameElement | null;
  confidence: number;
  metadata?: Record<string, unknown>;
  imageBase64?: string; // For image CAPTCHA local solving
}

export interface CaptchaSolveResult {
  success: boolean;
  token?: string;
  error?: string;
  captchaType: CaptchaType;
  timestamp: number;
}

export interface CaptchaSolverConfig {
  enabled: boolean;
  autoClick: boolean;
  hideUI: boolean;
  retryAttempts: number;
  timeout: number;
  delay: {
    min: number;
    max: number;
  };
}
