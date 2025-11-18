// ----------------------------------------------------------------------------
// 2. ERROR CODES CONSTANTS
// src/modules/shared/error/constants/error-codes.constant.ts
// ----------------------------------------------------------------------------

export const ERROR_CODES = {
  // General Errors (1000-1999)
  INTERNAL_SERVER_ERROR: 'ERR_1000',
  UNKNOWN_ERROR: 'ERR_1001',
  SERVICE_UNAVAILABLE: 'ERR_1002',
  TIMEOUT: 'ERR_1003',

  // Validation Errors (2000-2999)
  VALIDATION_ERROR: 'ERR_2000',
  INVALID_INPUT: 'ERR_2001',
  MISSING_REQUIRED_FIELD: 'ERR_2002',
  INVALID_FORMAT: 'ERR_2003',
  OUT_OF_RANGE: 'ERR_2004',

  // Authentication Errors (3000-3999)
  UNAUTHORIZED: 'ERR_3000',
  INVALID_TOKEN: 'ERR_3001',
  TOKEN_EXPIRED: 'ERR_3002',
  INSUFFICIENT_PERMISSIONS: 'ERR_3003',
  INVALID_CREDENTIALS: 'ERR_3004',

  // Resource Errors (4000-4999)
  NOT_FOUND: 'ERR_4000',
  RESOURCE_NOT_FOUND: 'ERR_4001',
  ALREADY_EXISTS: 'ERR_4002',
  CONFLICT: 'ERR_4003',

  // Business Logic Errors (5000-5999)
  BUSINESS_RULE_VIOLATION: 'ERR_5000',
  INVALID_STATE: 'ERR_5001',
  OPERATION_NOT_ALLOWED: 'ERR_5002',
  QUOTA_EXCEEDED: 'ERR_5003',

  // External Service Errors (6000-6999)
  EXTERNAL_SERVICE_ERROR: 'ERR_6000',
  API_REQUEST_FAILED: 'ERR_6001',
  DATABASE_ERROR: 'ERR_6002',
  CACHE_ERROR: 'ERR_6003',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unknown error occurred',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ERROR_CODES.TIMEOUT]: 'Request timeout',

  [ERROR_CODES.VALIDATION_ERROR]: 'Validation failed',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ERROR_CODES.INVALID_FORMAT]: 'Invalid format',
  [ERROR_CODES.OUT_OF_RANGE]: 'Value is out of acceptable range',

  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials',

  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'Requested resource not found',
  [ERROR_CODES.ALREADY_EXISTS]: 'Resource already exists',
  [ERROR_CODES.CONFLICT]: 'Resource conflict',

  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'Business rule violation',
  [ERROR_CODES.INVALID_STATE]: 'Invalid state for operation',
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'Operation not allowed',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Quota exceeded',

  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ERROR_CODES.API_REQUEST_FAILED]: 'API request failed',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error',
  [ERROR_CODES.CACHE_ERROR]: 'Cache error',
};
