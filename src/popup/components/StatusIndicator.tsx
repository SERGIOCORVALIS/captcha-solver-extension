/**
 * Status Indicator Component
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

import React from "react";

interface StatusIndicatorProps {
  enabled: boolean;
  size?: "small" | "medium" | "large";
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  enabled,
  size = "medium",
}) => {
  const sizeClasses = {
    small: "w-2 h-2",
    medium: "w-3 h-3",
    large: "w-4 h-4",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full ${
          enabled ? "bg-green-500" : "bg-gray-400"
        } animate-pulse`}
      />
      <span className="text-sm text-gray-600">
        {enabled ? "Active" : "Inactive"}
      </span>
    </div>
  );
};
