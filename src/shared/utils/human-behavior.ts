/**
 * Human Behavior Simulation Utilities
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { randomSleep, humanDelay } from './delay-utils';

/**
 * Simulate reading time before action
 */
export async function simulateReadingTime(
  minTime = 500,
  maxTime = 2000
): Promise<void> {
  const readingTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  await randomSleep(readingTime * 0.5, readingTime);
}

/**
 * Simulate hesitation before clicking
 */
export async function simulateHesitation(
  baseDelay = 200,
  variance = 0.3
): Promise<void> {
  await humanDelay(baseDelay, variance);
}

/**
 * Simulate typing with human-like delays
 */
export async function simulateTyping(
  text: string,
  input: HTMLInputElement | HTMLTextAreaElement,
  options: {
    minDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<void> {
  const minDelay = options.minDelay ?? 50;
  const maxDelay = options.maxDelay ?? 150;

  for (let i = 0; i < text.length; i++) {
    input.value = text.substring(0, i + 1);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Random delay between keystrokes
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Occasional longer pause (thinking)
    if (Math.random() < 0.1) {
      await randomSleep(200, 500);
    }
  }

  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Simulate scrolling to element
 */
export async function simulateScrollToElement(
  element: HTMLElement,
  options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
  } = {}
): Promise<void> {
  const behavior = options.behavior ?? 'smooth';
  const block = options.block ?? 'center';

  element.scrollIntoView({
    behavior,
    block,
    inline: 'nearest',
  });

  // Wait for scroll to complete
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * Simulate page interaction before CAPTCHA action
 */
export async function simulatePageInteraction(): Promise<void> {
  // Random mouse movements
  for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;

    const mouseMoveEvent = new MouseEvent('mousemove', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });

    document.dispatchEvent(mouseMoveEvent);
    await randomSleep(100, 300);
  }

  // Random scroll
  if (Math.random() < 0.5) {
    const scrollAmount = Math.random() * 200 - 100;
    window.scrollBy({
      top: scrollAmount,
      behavior: 'smooth',
    });
    await randomSleep(200, 500);
  }
}

/**
 * Get random delay with human-like distribution
 */
export function getHumanDelay(base: number, variance = 0.2): number {
  const variation = base * variance;
  const min = base - variation;
  const max = base + variation;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
