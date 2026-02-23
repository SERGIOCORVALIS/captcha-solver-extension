/**
 * hCaptcha Detector Tests
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HCaptchaDetector } from '../../../src/shared/detectors/hcaptcha-detector';
import { CaptchaType } from '../../../src/shared/types/captcha.types';

describe('HCaptchaDetector', () => {
  let detector: HCaptchaDetector;

  beforeEach(() => {
    detector = new HCaptchaDetector();
  });

  it('should detect hCaptcha when checkbox is present', async () => {
    const checkbox = document.createElement('div');
    checkbox.className = 'hcaptcha-box';
    document.body.appendChild(checkbox);

    const result = await detector.detect();

    expect(result).not.toBeNull();
    expect(result?.type).toBe(CaptchaType.HCAPTCHA);
    expect(result?.confidence).toBeGreaterThan(0);

    document.body.removeChild(checkbox);
  });

  it('should detect hCaptcha when iframe is present', async () => {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://hcaptcha.com/1/api.js';
    document.body.appendChild(iframe);

    const result = await detector.detect();

    expect(result).not.toBeNull();
    expect(result?.type).toBe(CaptchaType.HCAPTCHA);

    document.body.removeChild(iframe);
  });

  it('should detect hCaptcha when hcaptcha global is available', async () => {
    (window as unknown as { hcaptcha?: unknown }).hcaptcha = {};

    const result = await detector.detect();

    expect(result).not.toBeNull();
    expect(result?.type).toBe(CaptchaType.HCAPTCHA);

    delete (window as unknown as { hcaptcha?: unknown }).hcaptcha;
  });

  it('should return null when no hCaptcha is detected', async () => {
    document.body.innerHTML = '';

    const result = await detector.detect();

    expect(result).toBeNull();
  });

  it('should extract site key from element', async () => {
    const container = document.createElement('div');
    container.setAttribute('data-sitekey', 'test-hcaptcha-key');
    container.className = 'h-captcha';
    document.body.appendChild(container);

    const result = await detector.detect();

    expect(result).not.toBeNull();
    expect(result?.siteKey).toBe('test-hcaptcha-key');

    document.body.removeChild(container);
  });
});
