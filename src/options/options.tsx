/**␊
 * Options Page Entry Point␊
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.␊
 */␊
␊
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./options.css";
␊
const container = document.getElementById("root");
if (container) {␊
  const root = createRoot(container);␊
  root.render(␊
    <React.StrictMode>␊
      <App />␊
    </React.StrictMode>,
  );␊
}␊
