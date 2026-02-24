/**
 * Options Page App Component
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import React, { useEffect, useState } from "react";
import { StorageAPI } from "../shared/api/storage-api";
import { ExtensionConfig, ApiProvider } from "../shared/types/config.types";
import { TabNavigation } from "./components/TabNavigation";
import { validateConfig } from "../shared/utils/validation-utils";
import { isValidUrl } from "../shared/utils/validation";

const OptionsApp: React.FC = () => {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await StorageAPI.getConfig();
      setConfig(cfg);
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<ExtensionConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  const saveConfig = async () => {
    if (!config) return;

    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.valid) {
      setErrors(
        validation.errors.reduce(
          (acc, error, index) => {
            acc[`error_${index}`] = error;
            return acc;
          },
          {} as Record<string, string>,
        ),
      );
      alert(
        "Configuration validation failed:\n" + validation.errors.join("\n"),
      );
      return;
    }

    setErrors({});

    try {
      await StorageAPI.updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Failed to save configuration");
    }
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "captcha", label: "CAPTCHA Types" },
    { id: "api", label: "API Settings" },
    { id: "advanced", label: "Advanced" },
    { id: "statistics", label: "Statistics" },
  ];

  if (loading) {
    return <div className="options-container">Loading...</div>;
  }

  if (!config) {
    return (
      <div className="options-container">Failed to load configuration</div>
    );
  }

  return (
    <div className="options-container">
      <h1>CAPTCHA Solver Settings</h1>

      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {errors && Object.keys(errors).length > 0 && (
        <div className="error-messages">
          {Object.values(errors).map((error, index) => (
            <div key={index} className="error-message">
              {error}
            </div>
          ))}
        </div>
      )}

      {activeTab === "general" && (
        <div className="settings-section">
          <h2>General</h2>
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
            />
            Enable extension
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.autoSolve}
              onChange={(e) => updateConfig({ autoSolve: e.target.checked })}
            />
            Auto-solve CAPTCHAs
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.hideUI}
              onChange={(e) => updateConfig({ hideUI: e.target.checked })}
            />
            Hide CAPTCHA UI during solving
          </label>
        </div>
      )}

      {activeTab === "captcha" && (
        <div className="settings-section">
          <h2>CAPTCHA Types</h2>
          <label>
            <input
              type="checkbox"
              checked={config.captchaTypes.recaptchaV2}
              onChange={(e) =>
                updateConfig({
                  captchaTypes: {
                    ...config.captchaTypes,
                    recaptchaV2: e.target.checked,
                  },
                })
              }
            />
            reCAPTCHA v2
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.captchaTypes.recaptchaV3}
              onChange={(e) =>
                updateConfig({
                  captchaTypes: {
                    ...config.captchaTypes,
                    recaptchaV3: e.target.checked,
                  },
                })
              }
            />
            reCAPTCHA v3
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.captchaTypes.hcaptcha}
              onChange={(e) =>
                updateConfig({
                  captchaTypes: {
                    ...config.captchaTypes,
                    hcaptcha: e.target.checked,
                  },
                })
              }
            />
            hCaptcha
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.captchaTypes.turnstile}
              onChange={(e) =>
                updateConfig({
                  captchaTypes: {
                    ...config.captchaTypes,
                    turnstile: e.target.checked,
                  },
                })
              }
            />
            Cloudflare Turnstile
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.captchaTypes.imageCaptcha}
              onChange={(e) =>
                updateConfig({
                  captchaTypes: {
                    ...config.captchaTypes,
                    imageCaptcha: e.target.checked,
                  },
                })
              }
            />
            Image CAPTCHA
          </label>
        </div>
      )}

      {activeTab === "api" && (
        <div className="settings-section">
          <h2>API Configuration</h2>
          <label>
            Provider:
            <select
              value={config.apiConfig.provider}
              onChange={(e) =>
                updateConfig({
                  apiConfig: {
                    ...config.apiConfig,
                    provider: e.target.value as ApiProvider,
                  },
                })
              }
            >
              <option value="2captcha">2Captcha</option>
              <option value="anticaptcha">AntiCaptcha</option>
              <option value="capsolver">CapSolver</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label>
            API Key:
            <input
              type="password"
              value={config.apiConfig.apiKey}
              onChange={(e) =>
                updateConfig({
                  apiConfig: { ...config.apiConfig, apiKey: e.target.value },
                })
              }
              placeholder="Enter your API key"
            />
            {errors.apiKey && (
              <span style={{ color: "red", fontSize: "12px" }}>
                {errors.apiKey}
              </span>
            )}
          </label>
          {config.apiConfig.provider === "custom" && (
            <label>
              Custom Endpoint:
              <input
                type="text"
                value={config.apiConfig.endpoint || ""}
                onChange={(e) => {
                  const endpoint = e.target.value;
                  updateConfig({
                    apiConfig: { ...config.apiConfig, endpoint },
                  });
                  // Validate on change
                  if (endpoint) {
                    if (!isValidUrl(endpoint)) {
                      setErrors((prev) => ({
                        ...prev,
                        endpoint: "Invalid URL format",
                      }));
                    } else {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.endpoint;
                        return newErrors;
                      });
                    }
                  }
                }}
                placeholder="https://api.example.com/solve"
              />
              {errors.endpoint && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.endpoint}
                </span>
              )}
            </label>
          )}
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="settings-section">
          <h2>Advanced</h2>
          <label>
            Click Delay (ms):
            <input
              type="number"
              value={config.advanced.clickDelay}
              onChange={(e) =>
                updateConfig({
                  advanced: {
                    ...config.advanced,
                    clickDelay: parseInt(e.target.value) || 500,
                  },
                })
              }
              min="0"
            />
          </label>
          <label>
            Solve Delay (ms):
            <input
              type="number"
              value={config.advanced.solveDelay}
              onChange={(e) =>
                updateConfig({
                  advanced: {
                    ...config.advanced,
                    solveDelay: parseInt(e.target.value) || 1000,
                  },
                })
              }
              min="0"
            />
          </label>
          <label>
            Retry Attempts:
            <input
              type="number"
              value={config.advanced.retryAttempts}
              onChange={(e) =>
                updateConfig({
                  advanced: {
                    ...config.advanced,
                    retryAttempts: parseInt(e.target.value) || 3,
                  },
                })
              }
              min="0"
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.advanced.enableLogging}
              onChange={(e) =>
                updateConfig({
                  advanced: {
                    ...config.advanced,
                    enableLogging: e.target.checked,
                  },
                })
              }
            />
            Enable logging
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.advanced.mouseMovement}
              onChange={(e) =>
                updateConfig({
                  advanced: {
                    ...config.advanced,
                    mouseMovement: e.target.checked,
                  },
                })
              }
            />
            Simulate mouse movement
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.advanced.humanLikeBehavior}
              onChange={(e) =>
                updateConfig({
                  advanced: {
                    ...config.advanced,
                    humanLikeBehavior: e.target.checked,
                  },
                })
              }
            />
            Human-like behavior
          </label>
        </div>
      )}

      {activeTab === "statistics" && (
        <div className="settings-section">
          <h2>Statistics</h2>
          <p>Total Solved: {config.statistics.totalSolved}</p>
          <p>Errors: {config.statistics.errors}</p>
          <button
            onClick={async () => {
              await StorageAPI.resetStatistics();
              loadConfig();
            }}
          >
            Reset Statistics
          </button>
        </div>
      )}

      <div className="save-section">
        <button onClick={saveConfig} className="save-button">
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default OptionsApp;
