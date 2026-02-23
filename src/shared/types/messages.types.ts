/**
 * Message Types for Chrome Extension Communication
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { CaptchaType, CaptchaDetectionResult, CaptchaSolveResult } from './captcha.types';
import { ExtensionConfig } from './config.types';

export enum MessageType {
  // Content Script Messages
  DETECT_CAPTCHA = 'DETECT_CAPTCHA',
  SOLVE_CAPTCHA = 'SOLVE_CAPTCHA',
  CAPTCHA_DETECTED = 'CAPTCHA_DETECTED',
  CAPTCHA_SOLVED = 'CAPTCHA_SOLVED',
  CAPTCHA_ERROR = 'CAPTCHA_ERROR',
  INJECT_TOKEN = 'INJECT_TOKEN',

  // Background Messages
  GET_CONFIG = 'GET_CONFIG',
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  GET_STATISTICS = 'GET_STATISTICS',
  RESET_STATISTICS = 'RESET_STATISTICS',

  // Popup Messages
  TOGGLE_ENABLED = 'TOGGLE_ENABLED',
  GET_STATUS = 'GET_STATUS',
}

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface DetectCaptchaMessage extends BaseMessage {
  type: MessageType.DETECT_CAPTCHA;
  url: string;
}

export interface SolveCaptchaMessage extends BaseMessage {
  type: MessageType.SOLVE_CAPTCHA;
  detection: CaptchaDetectionResult;
}

export interface CaptchaDetectedMessage extends BaseMessage {
  type: MessageType.CAPTCHA_DETECTED;
  detection: CaptchaDetectionResult;
}

export interface CaptchaSolvedMessage extends BaseMessage {
  type: MessageType.CAPTCHA_SOLVED;
  result: CaptchaSolveResult;
}

export interface CaptchaErrorMessage extends BaseMessage {
  type: MessageType.CAPTCHA_ERROR;
  error: string;
  captchaType: CaptchaType;
}

export interface GetConfigMessage extends BaseMessage {
  type: MessageType.GET_CONFIG;
}

export interface UpdateConfigMessage extends BaseMessage {
  type: MessageType.UPDATE_CONFIG;
  config: Partial<ExtensionConfig>;
}

export interface GetStatisticsMessage extends BaseMessage {
  type: MessageType.GET_STATISTICS;
}

export interface ResetStatisticsMessage extends BaseMessage {
  type: MessageType.RESET_STATISTICS;
}

export interface ToggleEnabledMessage extends BaseMessage {
  type: MessageType.TOGGLE_ENABLED;
  enabled: boolean;
}

export interface GetStatusMessage extends BaseMessage {
  type: MessageType.GET_STATUS;
}

export interface InjectTokenMessage extends BaseMessage {
  type: MessageType.INJECT_TOKEN;
  detection: CaptchaDetectionResult;
  token: string;
}

export type ExtensionMessage =
  | DetectCaptchaMessage
  | SolveCaptchaMessage
  | CaptchaDetectedMessage
  | CaptchaSolvedMessage
  | CaptchaErrorMessage
  | GetConfigMessage
  | UpdateConfigMessage
  | GetStatisticsMessage
  | ResetStatisticsMessage
  | ToggleEnabledMessage
  | GetStatusMessage
  | InjectTokenMessage;

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
