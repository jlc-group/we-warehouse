import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build version: 2025-10-01 (force cache invalidation)

// Suppress Chrome Extension errors that clutter the console
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('Could not establish connection') ||
    message.includes('Receiving end does not exist') ||
    message.includes('runtime.lastError') ||
    message.includes('warmup.html')
  ) {
    return; // Don't log extension errors
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(
  <App />
);
