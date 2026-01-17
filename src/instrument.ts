/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// FIX 1: src/instrument.ts - Remove invalid 'tracing' option
// ============================================================================

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
  sendDefaultPii: false,

  // Integrations
  integrations: [
    // Add profiling integration
    nodeProfilingIntegration(),

    // ✅ FIXED: Remove 'tracing' option - it's deprecated
    // The tracing is now controlled by tracesSampleRate above
    Sentry.httpIntegration({
      // breadcrumbs: true, // Optional: track HTTP requests as breadcrumbs
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
    'Non-Error exception captured',
    'Non-Error promise rejection captured',
    'Network request failed',
    'Failed to fetch',
    'ResizeObserver loop limit exceeded',
  ],

  // Only enable in production or when explicitly configured
  enabled:
    process.env.NODE_ENV === 'production' ||
    process.env.SENTRY_ENABLED === 'true',
});
