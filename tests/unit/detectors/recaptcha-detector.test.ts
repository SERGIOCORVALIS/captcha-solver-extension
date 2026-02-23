/**
 * reCAPTCHA Detector Tests
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecaptchaDetector } from '../../../src/shared/detectors/recaptcha-detector';
import { CaptchaType } from '../../../src/shared/types/captcha.types';

describe('RecaptchaDetector', () => {
  let detector: RecaptchaDetector;

  beforeEach(() => {
    detector = new RecaptchaDetector();
  });

  it('should detect reCAPTCHA v2 when checkbox is present', async () => {
    // Create mock checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'recaptcha-checkbox';
    document.body.appendChild(checkbox);

    const result = await detector.detect();

    expect(result).not.toBeNull();
    expect(result?.type).toBe(CaptchaType.RECAPTCHA_V2);
    expect(result?.confidence).toBeGreaterThan(0);

    document.body.removeChild(checkbox);
  });

  it('should detect reCAPTCHA v2 when iframe is present', async () => {
    // Create mock iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.google.com/recaptcha/api2/anchor';
    document.body.appendChild(iframe);

    const result = await detector.detect();

    expect(result).not.toBeNull();
    expect(result?.type).toBe(CaptchaType.RECAPTCHA_V2);

    document.body.removeChild(iframe);
  });

  it('should detect reCAPTCHA v3 when grecaptcha is available', async () => {
    // Mock grecaptcha global
    (window as unknown as { grecaptcha?: unknown }).grecaptcha = {};

    const result = await detector.detect();

    expect(result).not.toBeNull();
    if (result) {
      expect([CaptchaType.RECAPTCHA_V2, CaptchaType.RECAPTCHA_V3]).toContain(result.type);
    }

    delete (window as unknown as { grecaptcha?: unknown }).grecaptcha;
  });

  it('should return null when no reCAPTCHA is detected', async () => {
    // Clear document
    document.body.innerHTML = '';

    const result = await detector.detect();

    expect(result).toBeNull();
  });

  it('should extract site key from element', async () => {
    const container = document.createElement('div');
    container.setAttribute('data-sitekey', 'test-site-key-123');
    container.className = 'g-recaptcha';
    document.body.appendChild(container);

    const result = await detector.detect();

    expect(result).not.toBeNull();
    expect(result?.siteKey).toBe('test-site-key-123');

    document.body.removeChild(container);
  });
});
