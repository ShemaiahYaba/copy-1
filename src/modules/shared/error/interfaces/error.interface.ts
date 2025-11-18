// ----------------------------------------------------------------------------
// 1. INTERFACES
// src/modules/shared/error/interfaces/error.interface.ts
// ----------------------------------------------------------------------------

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface IErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: string;
  context?: Record<string, any>;
  timestamp: Date;
  path?: string;
  method?: string;
  correlationId?: string;
  stack?: string;
}

export interface IAppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  isOperational: boolean;
}
