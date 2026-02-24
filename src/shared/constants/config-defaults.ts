/**␊
 * Default Configuration Values␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
import { ExtensionConfig } from "../types/config.types";
import { CaptchaType } from "../types/captcha.types";
␊
export const DEFAULT_CONFIG: ExtensionConfig = {␊
  enabled: true,␊
  autoSolve: true,␊
  hideUI: false,␊
  captchaTypes: {␊
    recaptchaV2: true,␊
    recaptchaV3: true,␊
    hcaptcha: true,␊
    turnstile: true,␊
    imageCaptcha: true,␊
  },␊
  apiConfig: {␊
    provider: "custom", // Default to 'custom' - use local server
    apiKey: "JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU", // Default API key from server/.env - MUST match server/.env API_KEY
    endpoint: "http://localhost:3001/api/solve", // Default local server endpoint
    timeout: 600000, // 10 minutes (600 seconds) - increased for complex CAPTCHAs with waitForFunction␊
    useLocalSolver: false, // Use local OCR for image CAPTCHA␊
  },␊
  advanced: {␊
    clickDelay: 500,␊
    solveDelay: 1000,␊
    retryAttempts: 3,␊
    enableLogging: false,␊
    mouseMovement: true,␊
    humanLikeBehavior: true,␊
  },␊
  whitelist: [],␊
  blacklist: [],␊
  statistics: {␊
    totalSolved: 0,␊
    byType: {␊
      [CaptchaType.RECAPTCHA_V2]: 0,␊
      [CaptchaType.RECAPTCHA_V3]: 0,␊
      [CaptchaType.HCAPTCHA]: 0,␊
      [CaptchaType.TURNSTILE]: 0,␊
      [CaptchaType.IMAGE_CAPTCHA]: 0,␊
      [CaptchaType.UNKNOWN]: 0,␊
    },␊
    lastSolved: null,␊
    errors: 0,␊
  },␊
} as const;␊
␊
export const STORAGE_KEYS = {␊
  CONFIG: "extension_config",
  STATISTICS: "statistics",
  LAST_UPDATE: "last_update",
} as const;␊
