/**
 * CAPTCHA DOM Selectors
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

export const RECAPTCHA_SELECTORS = {
  // reCAPTCHA v2
  v2: {
    checkbox: '.recaptcha-checkbox',
    checkboxBorder: '.recaptcha-checkbox-border',
    challenge: '.rc-anchor-challenge',
    iframe: 'iframe[src*="recaptcha/api2/anchor"]',
    challengeIframe: 'iframe[src*="recaptcha/api2/bframe"]',
    siteKey: '[data-sitekey]',
  },
  // reCAPTCHA v3
  v3: {
    badge: '.grecaptcha-badge',
    iframe: 'iframe[src*="recaptcha/api2/webworker"]',
  },
  // Common
  container: '#recaptcha',
  widget: '.g-recaptcha',
} as const;

export const HCAPTCHA_SELECTORS = {
  checkbox: '.hcaptcha-box',
  iframe: 'iframe[src*="hcaptcha.com"]',
  challenge: '.hcaptcha-challenge',
  container: '.h-captcha',
  siteKey: '[data-sitekey]',
} as const;

export const TURNSTILE_SELECTORS = {
  widget: '.cf-turnstile',
  iframe: 'iframe[src*="challenges.cloudflare.com"]',
  siteKey: '[data-sitekey]',
} as const;

export const IMAGE_CAPTCHA_SELECTORS = {
  image: 'img[alt*="captcha"], img[alt*="CAPTCHA"]',
  input: 'input[name*="captcha"], input[id*="captcha"]',
  container: '[class*="captcha"], [id*="captcha"]',
} as const;

export const CAPTCHA_DOMAINS = {
  recaptcha: [
    'www.google.com',
    'www.gstatic.com',
    'www.recaptcha.net',
    'recaptcha.google.com',
  ],
  hcaptcha: ['hcaptcha.com', 'js.hcaptcha.com'],
  turnstile: ['challenges.cloudflare.com', 'cloudflare.com'],
} as const;
