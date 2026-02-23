/**
 * Popup App Component
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import React, { useEffect, useState } from 'react';
import { StorageAPI } from '../shared/api/storage-api';
import { ExtensionConfig } from '../shared/types/config.types';
// import { MessageType } from '../shared/types/messages.types'; // Reserved for future use
import { StatusIndicator } from './components/StatusIndicator';
import { Statistics } from './components/Statistics';

const App: React.FC = () => {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await StorageAPI.getConfig();
      setConfig(cfg);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async () => {
    if (!config) return;

    const updated = { ...config, enabled: !config.enabled };
    await StorageAPI.updateConfig(updated);
    setConfig(updated);
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="popup-container">
        <div className="error">Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1>CAPTCHA Solver</h1>
      </div>

      <div className="popup-content">
        <div className="status-section mb-4">
          <StatusIndicator enabled={config.enabled} size="medium" />
          <label className="toggle-label mt-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={toggleEnabled}
              className="toggle-input"
            />
            <span className="toggle-text">
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        <Statistics statistics={config.statistics} />

        <div className="mt-4 space-y-2">
          <button onClick={openOptions} className="options-button w-full">
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
