// ----------------------------------------------------------------------------
// 1. INTERFACES - context-meta.interface.ts
// ----------------------------------------------------------------------------
export interface ContextMeta {
  // User identification
  userId?: string;
  username?: string;
  email?: string;

  // Organization/Tenant
  orgId?: string;
  orgName?: string;

  // Request tracking
  correlationId: string; // Required - always generated
  requestId?: string;

  // Request details
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;

  // Timestamps
  timestamp: Date;

  // Additional metadata
  [key: string]: any;
}

export interface ContextOptions {
  includeRequestDetails?: boolean;
  includeUserAgent?: boolean;
  includeIp?: boolean;
  customFields?: string[]; // Extract custom headers
}
