// ----------------------------------------------------------------------------
// SENTRY INITIALIZATION
// src/instrument.ts
// ----------------------------------------------------------------------------
// IMPORTANT: This file must be imported first in main.ts
// ----------------------------------------------------------------------------

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV || 'development',

  // Enable tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Send default PII (Personal Identifiable Information)
  // Set to false if you need to comply with strict privacy regulations
  sendDefaultPii: false,

  // Integrations
  integrations: [
    // Add profiling integration
    nodeProfilingIntegration(),

    // HTTP integration for tracking HTTP requests
    Sentry.httpIntegration({
      tracing: true,
    }),

    // Node.js context for additional context
    Sentry.nodeContextIntegration(),
  ],

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }

    // Remove sensitive data from context
    if (event.contexts) {
      const sensitiveKeys = [
        'password',
        'token',
        'apiKey',
        'secret',
        'creditCard',
        'ssn',
      ];

      Object.keys(event.contexts).forEach((contextKey) => {
        const context = event.contexts![contextKey];
        if (context && typeof context === 'object') {
          sensitiveKeys.forEach((key) => {
            if (key in context) {
              context[key] = '[Filtered]';
            }
          });
        }
      });
    }

    return event;
  },

  // Ignore certain errors
  ignoreErrors: [
    // Browser errors (if you're also using frontend Sentry)
    'Non-Error exception captured',
    'Non-Error promise rejection captured',

    // Network errors
    'Network request failed',
    'Failed to fetch',

    // Common non-critical errors
    'ResizeObserver loop limit exceeded',
  ],

  // Only enable in production or when explicitly configured
  enabled:
    process.env.NODE_ENV === 'production' ||
    process.env.SENTRY_ENABLED === 'true',
});
