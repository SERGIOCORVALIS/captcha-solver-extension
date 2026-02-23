/**
 * Logger Utility
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

class Logger {
  private enabled = false;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Always log important messages (INFO, WARN, ERROR) regardless of enabled state
    // Only skip DEBUG if disabled
    if (!this.enabled && level === LogLevel.DEBUG) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with [CAPTCHA Solver] prefix for visibility
    const prefix = `[CAPTCHA Solver] [${level}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, contextStr);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, contextStr);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, contextStr);
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, contextStr);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
