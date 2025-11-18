// ----------------------------------------------------------------------------
// 4. VALIDATION ERROR CLASS
// src/modules/shared/error/classes/validation-error.class.ts
// ----------------------------------------------------------------------------

import { AppError } from './app-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[], message?: string) {
    super(
      ERROR_CODES.VALIDATION_ERROR,
      message || 'Validation failed',
      { errors },
      ErrorSeverity.LOW,
      true,
    );

    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  static fromValidationErrors(validationErrors: any[]): ValidationError {
    const errors: ValidationErrorDetail[] = validationErrors.map((err) => ({
      field: err.property,
      message: Object.values(err.constraints || {}).join(', '),
      value: err.value,
      constraint: Object.keys(err.constraints || {})[0],
    }));

    return new ValidationError(errors);
  }
}
