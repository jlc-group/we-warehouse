// Chrome Extension Error Handler
// This script prevents extension-related console errors from cluttering the console

(function() {
  'use strict';
  
  // Override console.error to filter out extension errors
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Filter out common Chrome extension errors
    if (
      message.includes('Could not establish connection') ||
      message.includes('Receiving end does not exist') ||
      message.includes('runtime.lastError') ||
      message.includes('Extension context invalidated') ||
      message.includes('warmup.html')
    ) {
      // Don't log these extension errors
      return;
    }
    
    // Log other errors normally
    originalConsoleError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    
    // Filter out extension warnings
    if (
      message.includes('Extension') ||
      message.includes('runtime.lastError')
    ) {
      return;
    }
    
    originalConsoleWarn.apply(console, args);
  };
  
  // Handle unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message) {
      const message = event.reason.message;
      if (
        message.includes('Could not establish connection') ||
        message.includes('Extension')
      ) {
        event.preventDefault(); // Prevent the error from being logged
      }
    }
  });
  
  // Suppress chrome.runtime errors
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    const originalSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = function(...args) {
      try {
        return originalSendMessage.apply(chrome.runtime, args);
      } catch (e) {
        // Silently ignore extension connection errors
        return;
      }
    };
  }
  
  console.log('🛡️ Extension error handler loaded');
})();
