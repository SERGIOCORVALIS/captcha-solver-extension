 * Image Compression Utilities␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
export interface CompressionOptions {␊
  maxWidth?: number;␊
  maxHeight?: number;␊
  quality?: number; // 0.0 to 1.0␊
  format?: "jpeg" | "webp" | "png";
}␊
␊
/**␊
 * Compress image before sending to reduce bandwidth␊
 */␊
export async function compressImage(␊
  base64: string,␊
  options: CompressionOptions = {},
): Promise<string> {␊
  const {␊
    maxWidth = 800,␊
    maxHeight = 600,␊
    quality = 0.8,␊
    format = "jpeg",
  } = options;␊
␊
  return new Promise((resolve, reject) => {␊
    const img = new Image();␊
    let timeoutId: ReturnType<typeof setTimeout> | null = null;␊
␊
    img.onload = () => {␊
      if (timeoutId) {␊
        clearTimeout(timeoutId);␊
        timeoutId = null;␊
      }␊
␊
      try {␊
        const canvas = document.createElement("canvas");
        let width = img.width;␊
        let height = img.height;␊
␊
        // Calculate new dimensions␊
        if (width > maxWidth) {␊
          height = (height * maxWidth) / width;␊
          width = maxWidth;␊
        }␊
        if (height > maxHeight) {␊
          width = (width * maxHeight) / height;␊
          height = maxHeight;␊
        }␊
␊
        canvas.width = width;␊
        canvas.height = height;␊
        const ctx = canvas.getContext("2d");
␊
        if (!ctx) {␊
          reject(new Error("Failed to get canvas context"));
          return;␊
        }␊
␊
        // Draw image with new dimensions␊
        ctx.drawImage(img, 0, 0, width, height);␊
␊
        // Convert to desired format␊
        let mimeType = "image/jpeg";
        if (format === "webp") {
          mimeType = "image/webp";
        } else if (format === "png") {
          mimeType = "image/png";
        }␊
␊
        // Try to use WebP if supported, fallback to JPEG␊
        let compressed: string;␊
        try {␊
          compressed = canvas.toDataURL(mimeType, quality);␊

          // If WebP is not supported, browser will return empty string or PNG␊
          if (!compressed || compressed.length < 100) {␊
            compressed = canvas.toDataURL("image/jpeg", quality);
          }␊
        } catch (_error) {
          // Fallback to JPEG if format not supported␊
          compressed = canvas.toDataURL("image/jpeg", quality);
        }␊
␊
        resolve(compressed);␊
      } catch (error) {␊
        reject(error instanceof Error ? error : new Error("Unknown error"));
      }␊
    };␊
␊
    img.onerror = () => {␊
      if (timeoutId) {␊
        clearTimeout(timeoutId);␊
        timeoutId = null;␊
      }␊
      reject(new Error("Failed to load image"));
    };␊
␊
    // Set timeout␊
    timeoutId = setTimeout(() => {␊
      timeoutId = null;␊
      reject(new Error("Image load timeout"));
    }, 10000);␊
␊
    img.src = base64;␊
  });␊
}␊
␊
/**␊
 * Check if WebP is supported␊
 */␊
export function isWebPSupported(): boolean {␊
  const canvas = document.createElement("canvas");
  canvas.width = 1;␊
  canvas.height = 1;␊
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
}␊
␊
/**␊
 * Get best format for compression␊
 */␊
export function getBestFormat(): "webp" | "jpeg" {
  return isWebPSupported() ? "webp" : "jpeg";
}␊
