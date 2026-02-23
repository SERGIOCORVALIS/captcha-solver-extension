/**
 * Mouse Movement Simulation Utilities
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

/**
 * Generate Bezier curve control points for natural mouse movement
 */
function generateBezierPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const curvature = Math.random() * 0.3 + 0.2; // Random curvature between 0.2 and 0.5

  // Control points for natural curve
  const cp1x = startX + (endX - startX) * 0.25 + (Math.random() - 0.5) * distance * curvature;
  const cp1y = startY + (endY - startY) * 0.25 + (Math.random() - 0.5) * distance * curvature;
  const cp2x = startX + (endX - startX) * 0.75 + (Math.random() - 0.5) * distance * curvature;
  const cp2y = startY + (endY - startY) * 0.75 + (Math.random() - 0.5) * distance * curvature;

  return { cp1x, cp1y, cp2x, cp2y };
}

/**
 * Calculate point on Bezier curve
 */
function bezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
}

/**
 * Simulate human-like mouse movement to target element
 */
export async function simulateMouseMovement(
  target: HTMLElement,
  options: {
    duration?: number;
    steps?: number;
    startX?: number;
    startY?: number;
  } = {}
): Promise<void> {
  const rect = target.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;

  const startX = options.startX ?? window.innerWidth / 2;
  const startY = options.startY ?? window.innerHeight / 2;
  const duration = options.duration ?? Math.random() * 300 + 200; // 200-500ms
  const steps = options.steps ?? 20;

  const { cp1x, cp1y, cp2x, cp2y } = generateBezierPoints(startX, startY, targetX, targetY);
  const stepDelay = duration / steps;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = bezierPoint(t, startX, cp1x, cp2x, targetX);
    const y = bezierPoint(t, startY, cp1y, cp2y, targetY);

    // Add small random variation
    const variationX = (Math.random() - 0.5) * 2;
    const variationY = (Math.random() - 0.5) * 2;

    const mouseMoveEvent = new MouseEvent('mousemove', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x + variationX,
      clientY: y + variationY,
    });

    target.dispatchEvent(mouseMoveEvent);

    if (i < steps) {
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
    }
  }
}

/**
 * Simulate mouse hover before click
 */
export async function simulateHover(target: HTMLElement, duration = 100): Promise<void> {
  const mouseEnterEvent = new MouseEvent('mouseenter', {
    view: window,
    bubbles: true,
    cancelable: true,
  });

  const mouseOverEvent = new MouseEvent('mouseover', {
    view: window,
    bubbles: true,
    cancelable: true,
  });

  target.dispatchEvent(mouseEnterEvent);
  target.dispatchEvent(mouseOverEvent);

  await new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * Simulate human-like click with mouse movement
 */
export async function simulateHumanClick(
  target: HTMLElement,
  options: {
    moveMouse?: boolean;
    hoverDuration?: number;
    clickDelay?: number;
  } = {}
): Promise<void> {
  const moveMouse = options.moveMouse ?? true;
  const hoverDuration = options.hoverDuration ?? Math.random() * 100 + 50;
  const clickDelay = options.clickDelay ?? Math.random() * 50 + 10;

  if (moveMouse) {
    await simulateMouseMovement(target);
  }

  await simulateHover(target, hoverDuration);

  await new Promise((resolve) => setTimeout(resolve, clickDelay));

  // Mouse down
  const mouseDownEvent = new MouseEvent('mousedown', {
    view: window,
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  target.dispatchEvent(mouseDownEvent);

  await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 + 10));

  // Mouse up
  const mouseUpEvent = new MouseEvent('mouseup', {
    view: window,
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  target.dispatchEvent(mouseUpEvent);

  await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 + 10));

  // Click
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  target.dispatchEvent(clickEvent);
}
