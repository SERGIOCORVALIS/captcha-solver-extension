/**
 * Statistics Component
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import React from 'react';
import { ExtensionConfig } from '../../shared/types/config.types';
import { CaptchaType } from '../../shared/types/captcha.types';

interface StatisticsProps {
  statistics: ExtensionConfig['statistics'];
}

export const Statistics: React.FC<StatisticsProps> = ({ statistics }) => {
  const typeNames: Record<CaptchaType, string> = {
    [CaptchaType.RECAPTCHA_V2]: 'reCAPTCHA v2',
    [CaptchaType.RECAPTCHA_V3]: 'reCAPTCHA v3',
    [CaptchaType.HCAPTCHA]: 'hCaptcha',
    [CaptchaType.TURNSTILE]: 'Turnstile',
    [CaptchaType.IMAGE_CAPTCHA]: 'Image',
    [CaptchaType.UNKNOWN]: 'Unknown',
  };

  const solvedTypes = Object.entries(statistics.byType).filter(([_, count]) => count > 0);

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h3 className="text-lg font-semibold mb-4">Statistics</h3>
      </div>

      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-value">{statistics.totalSolved}</div>
          <div className="stat-label">Total Solved</div>
        </div>

        <div className="stat-card">
          <div className="stat-value text-red-600">{statistics.errors}</div>
          <div className="stat-label">Errors</div>
        </div>
      </div>

      {solvedTypes.length > 0 && (
        <div className="statistics-breakdown mt-4">
          <h4 className="text-sm font-medium mb-2 text-gray-700">By Type:</h4>
          <div className="space-y-1">
            {solvedTypes.map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="text-gray-600">{typeNames[type as CaptchaType]}:</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {statistics.lastSolved && (
        <div className="mt-4 text-xs text-gray-500">
          Last solved: {new Date(statistics.lastSolved).toLocaleString()}
        </div>
      )}
    </div>
  );
};
