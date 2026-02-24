/**␊
 * Delay Utility Functions␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
/**␊
 * Sleep for specified milliseconds␊
 */␊
export function sleep(ms: number): Promise<void> {␊
  return new Promise((resolve) => setTimeout(resolve, ms));␊
}␊
␊
/**␊
 * Sleep for random time between min and max␊
 */␊
export function randomSleep(min: number, max: number): Promise<void> {␊
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;␊
  return sleep(delay);␊
}␊
␊
/**␊
 * Generate human-like delay (slightly randomized)␊
 */␊
export function humanDelay(baseDelay: number, variance = 0.2): Promise<void> {␊
  const varianceAmount = baseDelay * variance;␊
  const min = baseDelay - varianceAmount;␊
  const max = baseDelay + varianceAmount;␊
  return randomSleep(min, max);␊
}␊
