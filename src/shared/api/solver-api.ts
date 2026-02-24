/**
 * External CAPTCHA Solver API Integration
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import { ApiConfig } from "../types/config.types";
import { CaptchaType } from "../types/captcha.types";
import { isValidApiKey, isValidUrl, isValidSiteKey } from "../utils/validation";
import { retry } from "../utils/retry";
import { logger } from "../utils/logger";
import { LocalImageSolver } from "../solvers/local-image-solver";

export interface SolveRequest {
  type: CaptchaType;
  siteKey: string;
  pageUrl: string;
  action?: string; // For reCAPTCHA v3
  imageBase64?: string; // For image CAPTCHA
}

export interface SolveResponse {
  success: boolean;
  token?: string;
  error?: string;
  taskId?: string;
}

export class SolverAPI {
  private config: ApiConfig;
  private localImageSolver: LocalImageSolver | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
    if (config.useLocalSolver) {
      this.localImageSolver = new LocalImageSolver();
    }
  }

  /**
   * Solve CAPTCHA using configured API provider or local solver
   */
  async solve(request: SolveRequest): Promise<SolveResponse> {
    logger.info("SolverAPI solve called", {
      type: request.type,
      provider: this.config.provider,
      endpoint: this.config.endpoint,
      timeout: this.config.timeout,
      hasApiKey: !!this.config.apiKey,
    });

    // Validate request
    // For image CAPTCHA, site key is not required (only imageBase64 is needed)
    if (
      request.type !== CaptchaType.IMAGE_CAPTCHA &&
      !isValidSiteKey(request.siteKey)
    ) {
      return {
        success: false,
        error: "Invalid site key format",
      };
    }

    if (!isValidUrl(request.pageUrl)) {
      return {
        success: false,
        error: "Invalid page URL",
      };
    }

    // For image CAPTCHA, validate image data is present
    if (request.type === CaptchaType.IMAGE_CAPTCHA) {
      if (!request.imageBase64) {
        return {
          success: false,
          error: "Image data required for image CAPTCHA",
        };
      }

      // Try local solver first if enabled
      if (this.config.useLocalSolver) {
        try {
          return await this.solveLocalImage(request);
        } catch (error) {
          // Fallback to API if local solver fails
          logger.warn("Local solver failed, falling back to API", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Use API provider for other types or as fallback
    if (!this.config.provider || this.config.provider === "none") {
      if (
        request.type === CaptchaType.IMAGE_CAPTCHA &&
        !this.config.useLocalSolver
      ) {
        throw new Error(
          "No solver configured for image CAPTCHA. Enable local solver or configure API.",
        );
      }
      throw new Error("No API provider configured");
    }

    // Validate API key for external providers
    if (
      this.config.provider !== "custom" &&
      !isValidApiKey(this.config.apiKey || "")
    ) {
      return {
        success: false,
        error: "Invalid API key format",
      };
    }

    // Validate custom endpoint
    if (
      this.config.provider === "custom" &&
      !isValidUrl(this.config.endpoint || "")
    ) {
      return {
        success: false,
        error: "Invalid custom API endpoint",
      };
    }

    // Solve with retry logic
    logger.info("Routing solve request to provider", {
      provider: this.config.provider,
    });
    return retry(
      () => {
        switch (this.config.provider) {
          case "2captcha":
            logger.info("Using 2Captcha provider");
            return this.solve2Captcha(request);
          case "anticaptcha":
            logger.info("Using AntiCaptcha provider");
            return this.solveAntiCaptcha(request);
          case "capsolver":
            logger.info("Using CapSolver provider");
            return this.solveCapSolver(request);
          case "custom":
            logger.info("Using custom provider");
            return this.solveCustom(request);
          default:
            logger.error("Unsupported provider", {
              provider: this.config.provider,
            });
            throw new Error(
              `Unsupported API provider: ${this.config.provider}`,
            );
        }
      },
      {
        maxAttempts: 2,
        delay: 1000,
        onRetry: (attempt, error) => {
          logger.warn("API solve retry", {
            attempt,
            provider: this.config.provider,
            error: error.message,
          });
        },
      },
    );
  }

  /**
   * Solve image CAPTCHA locally using OCR
   */
  private async solveLocalImage(request: SolveRequest): Promise<SolveResponse> {
    if (!this.localImageSolver) {
      throw new Error("Local image solver not initialized");
    }

    if (!request.imageBase64) {
      throw new Error("Image data required for local solving");
    }

    try {
      const result = await this.localImageSolver.solveImageFromBase64(
        request.imageBase64,
      );

      if (result.success && result.text) {
        return {
          success: true,
          token: result.text,
        };
      }

      return {
        success: false,
        error: result.error || "Failed to solve image locally",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 2Captcha API integration
   */
  private async solve2Captcha(request: SolveRequest): Promise<SolveResponse> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      return { success: false, error: "API key not configured" };
    }

    try {
      // Create task
      const createTaskUrl = "https://2captcha.com/in.php";
      const taskParams = this.build2CaptchaTaskParams(request);
      const createResponse = await fetch(`${createTaskUrl}?${taskParams}`, {
        method: "GET",
      });

      const createText = await createResponse.text();
      if (createText.startsWith("ERROR")) {
        return { success: false, error: createText };
      }

      const taskId = createText.split("|")[1];
      if (!taskId) {
        return { success: false, error: "Failed to create task" };
      }

      // Poll for result
      const result = await this.poll2CaptchaResult(apiKey, taskId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private build2CaptchaTaskParams(request: SolveRequest): string {
    const params = new URLSearchParams({
      key: this.config.apiKey,
      json: "1",
    });

    switch (request.type) {
      case CaptchaType.RECAPTCHA_V2:
        params.append("method", "userrecaptcha");
        params.append("googlekey", request.siteKey);
        params.append("pageurl", request.pageUrl);
        break;
      case CaptchaType.RECAPTCHA_V3:
        params.append("method", "userrecaptcha");
        params.append("version", "v3");
        params.append("googlekey", request.siteKey);
        params.append("pageurl", request.pageUrl);
        params.append("action", request.action || "verify");
        break;
      case CaptchaType.HCAPTCHA:
        params.append("method", "hcaptcha");
        params.append("sitekey", request.siteKey);
        params.append("pageurl", request.pageUrl);
        break;
      case CaptchaType.TURNSTILE:
        params.append("method", "turnstile");
        params.append("sitekey", request.siteKey);
        params.append("pageurl", request.pageUrl);
        break;
      case CaptchaType.IMAGE_CAPTCHA:
        params.append("method", "base64");
        params.append("body", request.imageBase64 || "");
        break;
      default:
        throw new Error(`Unsupported CAPTCHA type: ${request.type}`);
    }

    return params.toString();
  }

  private async poll2CaptchaResult(
    apiKey: string,
    taskId: string,
    maxAttempts = 60,
  ): Promise<SolveResponse> {
    const getResultUrl = "https://2captcha.com/res.php";
    const timeout = this.config.timeout || 600000; // Default 10 minutes (increased for complex CAPTCHAs with waitForFunction)
    const interval = 5000; // 5 seconds
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() - startTime > timeout) {
        return { success: false, error: "Timeout waiting for result" };
      }

      await new Promise((resolve) => setTimeout(resolve, interval));

      try {
        const response = await fetch(
          `${getResultUrl}?key=${apiKey}&action=get&id=${taskId}&json=1`,
        );
        const data = await response.json();

        if (data.status === 1) {
          return { success: true, token: data.request, taskId };
        } else if (data.request !== "CAPCHA_NOT_READY") {
          return { success: false, error: data.request || "Unknown error" };
        }
      } catch {
        // Continue polling on error
        continue;
      }
    }

    return { success: false, error: "Max polling attempts reached" };
  }

  /**
   * AntiCaptcha API integration
   */
  private async solveAntiCaptcha(
    request: SolveRequest,
  ): Promise<SolveResponse> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      return { success: false, error: "API key not configured" };
    }

    try {
      // Create task
      const createTaskUrl = "https://api.anti-captcha.com/createTask";
      const taskData = this.buildAntiCaptchaTaskData(request);

      const createResponse = await fetch(createTaskUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientKey: apiKey,
          task: taskData,
        }),
      });

      const createResult = await createResponse.json();

      if (createResult.errorId !== 0) {
        return {
          success: false,
          error: createResult.errorDescription || "Failed to create task",
        };
      }

      const taskId = createResult.taskId;
      if (!taskId) {
        return { success: false, error: "Failed to get task ID" };
      }

      // Poll for result
      const result = await this.pollAntiCaptchaResult(apiKey, taskId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private buildAntiCaptchaTaskData(
    request: SolveRequest,
  ): Record<string, unknown> {
    // const baseTask: Record<string, unknown> = {}; // Reserved for future use

    switch (request.type) {
      case CaptchaType.RECAPTCHA_V2:
        return {
          type: "NoCaptchaTaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
      case CaptchaType.RECAPTCHA_V3:
        return {
          type: "RecaptchaV3TaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
          minScore: 0.3,
          pageAction: request.action || "verify",
        };
      case CaptchaType.HCAPTCHA:
        return {
          type: "HCaptchaTaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
      case CaptchaType.TURNSTILE:
        return {
          type: "TurnstileTaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
      case CaptchaType.IMAGE_CAPTCHA:
        return {
          type: "ImageToTextTask",
          body: request.imageBase64 || "",
        };
      default:
        throw new Error(`Unsupported CAPTCHA type: ${request.type}`);
    }
  }

  private async pollAntiCaptchaResult(
    apiKey: string,
    taskId: number,
    maxAttempts = 60,
  ): Promise<SolveResponse> {
    const getResultUrl = "https://api.anti-captcha.com/getTaskResult";
    const timeout = this.config.timeout || 600000; // Default 10 minutes (increased for complex CAPTCHAs with waitForFunction)
    const interval = 3000; // 3 seconds
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() - startTime > timeout) {
        return { success: false, error: "Timeout waiting for result" };
      }

      await new Promise((resolve) => setTimeout(resolve, interval));

      try {
        const response = await fetch(getResultUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientKey: apiKey,
            taskId,
          }),
        });

        const data = await response.json();

        if (data.errorId !== 0) {
          return {
            success: false,
            error: data.errorDescription || "Unknown error",
          };
        }

        if (data.status === "ready") {
          const solution = data.solution;
          const token =
            solution?.gRecaptchaResponse ||
            solution?.token ||
            solution?.text ||
            solution?.turnstileToken;

          if (token) {
            return { success: true, token, taskId: taskId.toString() };
          }
        } else if (data.status === "processing") {
          // Continue polling
          continue;
        } else {
          return { success: false, error: `Unexpected status: ${data.status}` };
        }
      } catch {
        // Continue polling on error
        continue;
      }
    }

    return { success: false, error: "Max polling attempts reached" };
  }

  /**
   * CapSolver API integration
   */
  private async solveCapSolver(request: SolveRequest): Promise<SolveResponse> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      return { success: false, error: "API key not configured" };
    }

    try {
      // Create task
      const createTaskUrl = "https://api.capsolver.com/createTask";
      const taskData = this.buildCapSolverTaskData(request);

      const createResponse = await fetch(createTaskUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientKey: apiKey,
          task: taskData,
        }),
      });

      const createResult = await createResponse.json();

      if (createResult.errorId !== 0) {
        return {
          success: false,
          error: createResult.errorDescription || "Failed to create task",
        };
      }

      const taskId = createResult.taskId;
      if (!taskId) {
        return { success: false, error: "Failed to get task ID" };
      }

      // Poll for result
      const result = await this.pollCapSolverResult(apiKey, taskId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private buildCapSolverTaskData(
    request: SolveRequest,
  ): Record<string, unknown> {
    switch (request.type) {
      case CaptchaType.RECAPTCHA_V2:
        return {
          type: "ReCaptchaV2TaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
      case CaptchaType.RECAPTCHA_V3:
        return {
          type: "ReCaptchaV3TaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
          pageAction: request.action || "verify",
          minScore: 0.3,
        };
      case CaptchaType.HCAPTCHA:
        return {
          type: "HCaptchaTaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
      case CaptchaType.TURNSTILE:
        return {
          type: "TurnstileTaskProxyless",
          websiteURL: request.pageUrl,
          websiteKey: request.siteKey,
        };
      case CaptchaType.IMAGE_CAPTCHA:
        return {
          type: "ImageToTextTask",
          body: request.imageBase64 || "",
        };
      default:
        throw new Error(`Unsupported CAPTCHA type: ${request.type}`);
    }
  }

  private async pollCapSolverResult(
    apiKey: string,
    taskId: string,
    maxAttempts = 60,
  ): Promise<SolveResponse> {
    const getResultUrl = "https://api.capsolver.com/getTaskResult";
    const timeout = this.config.timeout || 600000; // Default 10 minutes (increased for complex CAPTCHAs with waitForFunction)
    const interval = 3000; // 3 seconds
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() - startTime > timeout) {
        return { success: false, error: "Timeout waiting for result" };
      }

      await new Promise((resolve) => setTimeout(resolve, interval));

      try {
        const response = await fetch(getResultUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientKey: apiKey,
            taskId,
          }),
        });

        const data = await response.json();

        if (data.errorId !== 0) {
          return {
            success: false,
            error: data.errorDescription || "Unknown error",
          };
        }

        if (data.status === "ready") {
          const solution = data.solution;
          const token =
            solution?.gRecaptchaResponse ||
            solution?.token ||
            solution?.text ||
            solution?.turnstileToken;

          if (token) {
            return { success: true, token, taskId };
          }
        } else if (data.status === "processing") {
          // Continue polling
          continue;
        } else {
          return { success: false, error: `Unexpected status: ${data.status}` };
        }
      } catch {
        // Continue polling on error
        continue;
      }
    }

    return { success: false, error: "Max polling attempts reached" };
  }

  /**
   * Custom API integration - sends request to local server
   */
  private async solveCustom(request: SolveRequest): Promise<SolveResponse> {
    logger.info("solveCustom called", {
      type: request.type,
      siteKey: request.siteKey?.substring(0, 10) + "...",
      pageUrl: request.pageUrl?.substring(0, 50) + "...",
      hasImage: !!request.imageBase64,
      endpoint: this.config.endpoint,
    });

    logger.info("Solving with custom API", {
      type: request.type,
      siteKey: request.siteKey,
      pageUrl: request.pageUrl,
      endpoint: this.config.endpoint,
    });
    if (!this.config.endpoint) {
      return { success: false, error: "Custom API endpoint not configured" };
    }

    try {
      // Validate API key is present
      if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
        logger.error("API key is missing or empty");
        return {
          success: false,
          error:
            "API key is not configured. Please set the API key in extension settings.",
        };
      }

      logger.debug("Sending request to custom API", {
        endpoint: this.config.endpoint,
        type: request.type,
        hasApiKey: !!this.config.apiKey,
        apiKeyLength: this.config.apiKey.length,
        apiKeyPrefix: this.config.apiKey.substring(0, 4) + "...",
      });

      // Try to check server health first (quick check with short timeout)
      const healthCheckUrl = this.config.endpoint.replace(
        "/api/solve",
        "/health",
      );
      try {
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 2000); // 2 second timeout

        await fetch(healthCheckUrl, {
          method: "GET",
          signal: healthController.signal,
        }).catch(() => {
          // Ignore health check errors, we'll try the main request anyway
        });
        clearTimeout(healthTimeout);
      } catch {
        // Health check failed, but continue with main request
        logger.debug("Health check failed, but continuing with solve request");
      }

      // Make the solve request with timeout
      let response: Response;
      const timeout = this.config.timeout || 600000; // Default 10 minutes (increased for complex CAPTCHAs with waitForFunction)

      logger.info("Timeout configuration", {
        configured: this.config.timeout,
        used: timeout,
        timeoutSeconds: timeout / 1000,
      });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          logger.error("Timeout triggered", { timeoutSeconds: timeout / 1000 });
          controller.abort();
        }, timeout);

        logger.info("Sending fetch request to custom endpoint", {
          endpoint: this.config.endpoint,
        });
        logger.debug("Custom request payload metadata", {
          type: request.type,
          siteKey: request.siteKey?.substring(0, 10) + "...",
          pageUrl: request.pageUrl?.substring(0, 50) + "...",
          hasImage: !!request.imageBase64,
        });
        logger.debug("Custom request started", {
          startedAt: new Date().toISOString(),
        });
        logger.debug("API key metadata", {
          hasKey: !!this.config.apiKey,
        });

        response = await fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.config.apiKey || "",
            Authorization: `Bearer ${this.config.apiKey || ""}`,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        logger.debug("Custom response received", {
          receivedAt: new Date().toISOString(),
        });
        logger.info("Custom response status", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });
      } catch (fetchError) {
        const errorMessage =
          fetchError instanceof Error ? fetchError.message : "Unknown error";

        // Check if it's an abort (timeout)
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          logger.error("Request timeout", {
            endpoint: this.config.endpoint,
            timeout,
          });
          return {
            success: false,
            error: `Request timeout after ${timeout / 1000} seconds. The server may be slow or unresponsive.`,
          };
        }

        // Provide helpful error messages for common issues
        if (
          errorMessage.includes("Failed to fetch") ||
          errorMessage.includes("NetworkError") ||
          errorMessage.includes("ERR_FAILED") ||
          errorMessage.includes("ERR_CONNECTION_REFUSED") ||
          errorMessage.includes("ERR_NAME_NOT_RESOLVED")
        ) {
          logger.error("Cannot connect to server", {
            endpoint: this.config.endpoint,
            error: errorMessage,
          });

          // Extract port from endpoint for better error message
          let portInfo = "";
          try {
            const url = new URL(this.config.endpoint);
            portInfo = ` on port ${url.port || "3000"}`;
          } catch {
            portInfo = " on port 3000";
          }

          return {
            success: false,
            error: `Cannot connect to server at ${this.config.endpoint}.${portInfo} Please ensure the server is running. Start it with: server\\start-server-dev.bat`,
          };
        }

        // Re-throw other errors
        throw fetchError;
      }

      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
        } catch {
          errorText = "Unknown error";
        }

        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Provide helpful error messages
        if (response.status === 401) {
          try {
            const errorData = JSON.parse(errorText);
            if (
              errorData.error === "Invalid API key" ||
              errorData.error === "API key required"
            ) {
              errorMessage =
                "Invalid API key. Please check your API key in the extension settings and ensure it matches the server API_KEY in .env file.";
            } else {
              errorMessage = errorData.error || errorMessage;
            }
          } catch {
            errorMessage =
              "Invalid API key. Please check your API key in the extension settings and ensure it matches the server API_KEY in .env file.";
          }
        } else if (response.status === 404) {
          errorMessage =
            "API endpoint not found. Please check the endpoint URL in extension settings.";
        } else if (response.status >= 500) {
          errorMessage = `Server error: ${errorText || response.statusText}. Please check the server logs.`;
        }

        logger.error("Custom API request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          errorMessage,
        });

        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = await response.json();

      logger.info("Custom response data", {
        success: data.success,
        hasToken: !!data.token,
        tokenLength: data.token?.length || 0,
        error: data.error,
      });

      logger.debug("Custom API response", {
        success: data.success,
        hasToken: !!data.token,
        tokenLength: data.token?.length || 0,
        error: data.error,
      });

      if (!data.success) {
        logger.error("Server returned error", { error: data.error });
      } else if (!data.token || data.token.length === 0) {
        logger.warn("Server returned success but no token");
      } else {
        logger.info("Token received successfully from custom provider");
      }

      return {
        success: data.success || false,
        token: data.token,
        error: data.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("Custom API request error", {
        error: errorMessage,
        endpoint: this.config.endpoint,
      });

      // Provide helpful error messages
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_FAILED") ||
        errorMessage.includes("ERR_CONNECTION_REFUSED") ||
        errorMessage.includes("ERR_NAME_NOT_RESOLVED") ||
        errorMessage.includes("fetch")
      ) {
        // Extract port from endpoint for better error message
        let portInfo = "";
        try {
          const url = new URL(this.config.endpoint);
          portInfo = ` on port ${url.port || "3000"}`;
        } catch (_e) {
          portInfo = " on port 3000";
        }

        return {
          success: false,
          error: `Cannot connect to server at ${this.config.endpoint}.${portInfo} Please ensure the server is running. Start it with: server\\start-server-dev.bat`,
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
