/**␊
 * Debounce Utility␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
/**␊
 * Debounce function execution␊
 */␊
export function debounce<T extends (...args: unknown[]) => unknown>(␊
  func: T,␊
  wait: number,
): (...args: Parameters<T>) => void {␊
  let timeout: ReturnType<typeof setTimeout> | null = null;␊
␊
  return function executedFunction(...args: Parameters<T>) {␊
    const later = () => {␊
      timeout = null;␊
      func(...args);␊
    };␊
␊
    if (timeout) {␊
      clearTimeout(timeout);␊
    }␊
    timeout = setTimeout(later, wait);␊
  };␊
}␊
␊
/**␊
 * Throttle function execution␊
 */␊
export function throttle<T extends (...args: unknown[]) => unknown>(␊
  func: T,␊
  limit: number,
): (...args: Parameters<T>) => void {␊
  let inThrottle: boolean;␊
␊
  return function executedFunction(...args: Parameters<T>) {␊
    if (!inThrottle) {␊
      func(...args);␊
      inThrottle = true;␊
      setTimeout(() => {␊
        inThrottle = false;␊
      }, limit);␊
    }␊
  };␊
}␊
