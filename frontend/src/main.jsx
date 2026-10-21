import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import App from './App';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import ConnectionBanner from './components/feedback/ConnectionBanner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { queryClient } from './lib/queryClient';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {/* reducedMotion="user": animations switch off automatically for people who ask their OS for less motion */}
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <ToastProvider>
                <AuthProvider>
                  <ConnectionBanner />
                  <App />
                </AuthProvider>
              </ToastProvider>
            </BrowserRouter>
          </MotionConfig>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
