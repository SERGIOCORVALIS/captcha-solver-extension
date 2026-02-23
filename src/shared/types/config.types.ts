/**
 * Configuration Types
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { CaptchaType } from './captcha.types';

export type ApiProvider = '2captcha' | 'anticaptcha' | 'capsolver' | 'custom' | 'none';

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  endpoint?: string;
  timeout?: number;
  useLocalSolver?: boolean; // Use local OCR for image CAPTCHA
}

export interface CaptchaTypeConfig {
  recaptchaV2: boolean;
  recaptchaV3: boolean;
  hcaptcha: boolean;
  turnstile: boolean;
  imageCaptcha: boolean;
}

export interface AdvancedConfig {
  clickDelay: number;
  solveDelay: number;
  retryAttempts: number;
  enableLogging: boolean;
  mouseMovement: boolean;
  humanLikeBehavior: boolean;
}

export interface Statistics {
  totalSolved: number;
  byType: Record<CaptchaType, number>;
  lastSolved: Date | null;
  errors: number;
}

export interface ExtensionConfig {
  enabled: boolean;
  autoSolve: boolean;
  hideUI: boolean;
  captchaTypes: CaptchaTypeConfig;
  apiConfig: ApiConfig;
  advanced: AdvancedConfig;
  whitelist: string[];
  blacklist: string[];
  statistics: Statistics;
}
