// ----------------------------------------------------------------------------
// 5. BUSINESS ERROR CLASS
// src/modules/shared/error/classes/business-error.class.ts
// ----------------------------------------------------------------------------

import { AppError } from './app-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';

export class BusinessError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      ERROR_CODES.BUSINESS_RULE_VIOLATION,
      message,
      context,
      ErrorSeverity.MEDIUM,
      true,
    );

    this.name = 'BusinessError'; // ← ensures stack trace shows class name
    Object.setPrototypeOf(this, BusinessError.prototype);
  }

  static invalidState(
    message: string,
    context?: Record<string, any>,
  ): BusinessError {
    return new BusinessError(message, { ...context, reason: 'invalid_state' });
  }

  static notAllowed(operation: string, reason?: string): BusinessError {
    return new BusinessError(`Operation '${operation}' is not allowed`, {
      operation,
      reason,
    });
  }
}
