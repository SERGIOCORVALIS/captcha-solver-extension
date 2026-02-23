/**
 * Chrome Notifications Utility
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { CaptchaType } from '../types/captcha.types';

export interface NotificationOptions {
  title: string;
  message: string;
  type?: 'basic' | 'image';
  iconUrl?: string;
  priority?: -2 | -1 | 0 | 1 | 2;
}

/**
 * Show notification with auto-dismiss
 */
export async function showNotification(options: NotificationOptions): Promise<string | null> {
  try {
    // Request permission if not granted
    if (chrome.notifications && chrome.notifications.create) {
      const notificationId = await chrome.notifications.create({
        type: options.type || 'basic',
        iconUrl: options.iconUrl || chrome.runtime.getURL('icons/icon48.png'),
        title: options.title,
        message: options.message,
        priority: options.priority || 0,
        requireInteraction: false, // Auto-dismiss
      });

      // Auto-dismiss after 5 seconds for non-error notifications
      if (options.priority !== 2 && notificationId) {
        setTimeout(() => {
          chrome.notifications.clear(notificationId).catch(() => {
            // Ignore errors
          });
        }, 5000);
      }

      return notificationId;
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }

  return null;
}

/**
 * Show success notification for solved CAPTCHA
 */
export async function showCaptchaSolvedNotification(
  type: CaptchaType
): Promise<void> {
  const typeNames: Record<CaptchaType, string> = {
    [CaptchaType.RECAPTCHA_V2]: 'reCAPTCHA v2',
    [CaptchaType.RECAPTCHA_V3]: 'reCAPTCHA v3',
    [CaptchaType.HCAPTCHA]: 'hCaptcha',
    [CaptchaType.TURNSTILE]: 'Cloudflare Turnstile',
    [CaptchaType.IMAGE_CAPTCHA]: 'Image CAPTCHA',
    [CaptchaType.UNKNOWN]: 'CAPTCHA',
  };

  await showNotification({
    title: 'CAPTCHA Solved',
    message: `${typeNames[type]} solved successfully`,
    type: 'basic',
    priority: 0,
  });
}

/**
 * Show error notification
 */
export async function showErrorNotification(message: string): Promise<void> {
  await showNotification({
    title: 'CAPTCHA Solver Error',
    message,
    type: 'basic',
    priority: 1,
  });
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    if (chrome.notifications && chrome.notifications.getAll) {
      const notifications = await chrome.notifications.getAll();
      for (const id in notifications) {
        await chrome.notifications.clear(id);
      }
    }
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}
