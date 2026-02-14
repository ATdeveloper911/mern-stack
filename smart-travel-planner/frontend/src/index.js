import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress ResizeObserver errors (common React warning, harmless)
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    return; // Suppress this specific error
  }
  originalError.call(console, ...args);
};

// Also handle unhandled errors
window.addEventListener('error', (event) => {
  if (
    event.message &&
    event.message.includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    event.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
