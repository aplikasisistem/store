/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global Runtime Error Catcher
window.onerror = (message, source, lineno, colno, error) => {
  const timestamp = new Date().toISOString();
  console.error(`[GlobalRuntimeError] ${message} at ${source}:${lineno}:${colno}`, {
    error,
    timestamp,
  });
  return false;
};

// Global Unhandled Promise Rejection Catcher
window.addEventListener('unhandledrejection', (event) => {
  const timestamp = new Date().toISOString();
  console.error(`[UnhandledPromiseRejection] ${event.reason?.message || event.reason}`, {
    reason: event.reason,
    timestamp,
  });
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
