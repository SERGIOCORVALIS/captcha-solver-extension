/**
 * Local Image CAPTCHA Solver using OCR
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { createWorker } from "tesseract.js";
import { logger } from "../utils/logger";

export interface LocalSolveResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

export class LocalImageSolver {
  private worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  private isInitialized = false;

  /**
   * Initialize Tesseract.js worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      logger.info("Initializing local OCR solver...");
      this.worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      this.isInitialized = true;
      logger.info("Local OCR solver initialized");
    } catch (error) {
      logger.error("Failed to initialize OCR solver", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Solve image CAPTCHA using OCR
   */
  async solveImage(
    imageElement: HTMLImageElement | HTMLCanvasElement,
  ): Promise<LocalSolveResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.worker) {
        throw new Error("OCR worker not initialized");
      }

      logger.info("Solving image CAPTCHA locally...");

      // Convert image to canvas if needed
      const canvas = await this.imageToCanvas(imageElement);

      // Perform OCR
      const {
        data: { text, confidence },
      } = await this.worker.recognize(canvas);

      // Clean up text (remove whitespace, special chars)
      const cleanedText = this.cleanText(text);

      logger.info("Image CAPTCHA solved locally", {
        text: cleanedText,
        confidence: Math.round(confidence),
      });

      return {
        success: true,
        text: cleanedText,
        confidence: Math.round(confidence),
      };
    } catch (error) {
      logger.error("Failed to solve image CAPTCHA locally", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Solve image CAPTCHA from base64 string
   */
  async solveImageFromBase64(base64: string): Promise<LocalSolveResult> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      return new Promise((resolve) => {
        img.onload = async () => {
          const result = await this.solveImage(img);
          resolve(result);
        };

        img.onerror = () => {
          resolve({
            success: false,
            error: "Failed to load image from base64",
          });
        };

        img.src = base64;
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Convert image element to canvas
   */
  private async imageToCanvas(
    image: HTMLImageElement | HTMLCanvasElement,
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    if (image instanceof HTMLCanvasElement) {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
    } else {
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      ctx.drawImage(image, 0, 0);
    }

    // Preprocess image for better OCR
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const processed = this.preprocessImage(imageData);
    ctx.putImageData(processed, 0, 0);

    return canvas;
  }

  /**
   * Preprocess image for better OCR recognition
   */
  private preprocessImage(imageData: ImageData): ImageData {
    const data = imageData.data;
    // Convert to grayscale and enhance contrast
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to grayscale
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      // Enhance contrast (simple threshold)
      const threshold = 128;
      const value = gray > threshold ? 255 : 0;

      data[i] = value; // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
      // Alpha stays the same
    }

    return imageData;
  }

  /**
   * Clean recognized text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, "") // Remove all whitespace
      .replace(/[^a-zA-Z0-9]/g, "") // Remove special characters
      .toUpperCase(); // Convert to uppercase
  }

  /**
   * Terminate worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      logger.info("Local OCR solver terminated");
    }
  }
}
