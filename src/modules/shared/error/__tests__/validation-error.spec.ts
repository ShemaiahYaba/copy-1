// ----------------------------------------------------------------------------
// VALIDATION ERROR CLASS - UNIT TESTS
// src/modules/shared/error/__tests__/validation-error.class.spec.ts
// ----------------------------------------------------------------------------

import {
  ValidationError,
  ValidationErrorDetail,
} from '../classes/validation-error.class';
import { AppError } from '../classes/app-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';

describe('ValidationError Class', () => {
  describe('Error Creation', () => {
    it('should create with validation errors array', () => {
      const errors: ValidationErrorDetail[] = [
        {
          field: 'email',
          message: 'Invalid email format',
          value: 'notanemail',
        },
        { field: 'age', message: 'Must be at least 18', value: 15 },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError).toBeInstanceOf(AppError);
      expect(validationError.errors).toEqual(errors);
      expect(validationError.errors.length).toBe(2);
    });

    it('should set correct error code', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'username', message: 'Required field' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should set LOW severity', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'name', message: 'Invalid name' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.severity).toBe(ErrorSeverity.LOW);
    });

    it('should set isOperational to true', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Invalid email' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.isOperational).toBe(true);
    });

    it('should use default message if not provided', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'password', message: 'Too short' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.message).toBe('Validation failed');
    });

    it('should accept custom message', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Invalid' },
      ];
      const customMessage = 'Custom validation error';

      const validationError = new ValidationError(errors, customMessage);

      expect(validationError.message).toBe(customMessage);
    });

    it('should include errors in context', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'username', message: 'Required' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.context).toBeDefined();
      expect(validationError.context?.errors).toEqual(errors);
    });
  });

  describe('fromValidationErrors() Method', () => {
    it('should convert class-validator errors', () => {
      const classValidatorErrors = [
        {
          property: 'email',
          value: 'invalid@',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
        {
          property: 'age',
          value: 10,
          constraints: {
            min: 'age must not be less than 18',
          },
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);

      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError.errors.length).toBe(2);
    });

    it('should extract field, message, value', () => {
      const classValidatorErrors = [
        {
          property: 'username',
          value: 'ab',
          constraints: {
            minLength: 'username must be longer than or equal to 3 characters',
          },
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);
      const error = validationError.errors[0];

      expect(error.field).toBe('username');
      expect(error.message).toBe(
        'username must be longer than or equal to 3 characters',
      );
      expect(error.value).toBe('ab');
    });

    it('should handle multiple validation errors', () => {
      const classValidatorErrors = [
        {
          property: 'email',
          value: 'notanemail',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
        {
          property: 'password',
          value: '123',
          constraints: {
            minLength: 'password must be at least 8 characters',
          },
        },
        {
          property: 'age',
          value: 15,
          constraints: {
            min: 'age must not be less than 18',
          },
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);

      expect(validationError.errors.length).toBe(3);
      expect(validationError.errors[0].field).toBe('email');
      expect(validationError.errors[1].field).toBe('password');
      expect(validationError.errors[2].field).toBe('age');
    });

    it('should handle nested validation errors', () => {
      const classValidatorErrors = [
        {
          property: 'address.street',
          value: '',
          constraints: {
            isNotEmpty: 'address.street should not be empty',
          },
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);

      expect(validationError.errors[0].field).toBe('address.street');
    });

    it('should extract constraint name', () => {
      const classValidatorErrors = [
        {
          property: 'email',
          value: 'invalid',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);

      expect(validationError.errors[0].constraint).toBe('isEmail');
    });

    it('should handle multiple constraints', () => {
      const classValidatorErrors = [
        {
          property: 'password',
          value: 'abc',
          constraints: {
            minLength: 'password must be at least 8 characters',
            matches: 'password must contain at least one number',
          },
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);
      const error = validationError.errors[0];

      expect(error.message).toContain('password must be at least 8 characters');
      expect(error.message).toContain(
        'password must contain at least one number',
      );
      expect(error.constraint).toBe('minLength'); // First constraint
    });

    it('should handle empty constraints object', () => {
      const classValidatorErrors = [
        {
          property: 'field',
          value: 'value',
          constraints: {},
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);

      expect(validationError.errors[0].message).toBe('');
      expect(validationError.errors[0].constraint).toBeUndefined();
    });

    it('should handle undefined constraints', () => {
      const classValidatorErrors = [
        {
          property: 'field',
          value: 'value',
          constraints: undefined,
        },
      ];

      const validationError =
        ValidationError.fromValidationErrors(classValidatorErrors);

      expect(validationError.errors[0].message).toBe('');
    });
  });

  describe('Inheritance from AppError', () => {
    it('should extend AppError', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Invalid' },
      ];
      const validationError = new ValidationError(errors);

      expect(validationError instanceof AppError).toBe(true);
      expect(validationError instanceof ValidationError).toBe(true);
    });

    it('should have AppError properties', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'name', message: 'Required' },
      ];
      const validationError = new ValidationError(errors);

      expect(validationError).toHaveProperty('code');
      expect(validationError).toHaveProperty('severity');
      expect(validationError).toHaveProperty('context');
      expect(validationError).toHaveProperty('isOperational');
      expect(validationError).toHaveProperty('timestamp');
    });

    it('should have toJSON method from AppError', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Invalid' },
      ];
      const validationError = new ValidationError(errors);

      const json = validationError.toJSON();

      expect(json).toHaveProperty('status', 'error');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('context');
      // We know context is defined here because we just checked it above
      const typedJson = json as unknown as {
        context: { errors: ValidationErrorDetail[] };
      };
      expect(typedJson.context.errors).toEqual(errors);
    });
  });

  describe('ValidationErrorDetail Interface', () => {
    it('should support all required fields', () => {
      const error: ValidationErrorDetail = {
        field: 'email',
        message: 'Invalid email format',
      };

      const validationError = new ValidationError([error]);

      expect(validationError.errors[0]).toMatchObject(error);
    });

    it('should support optional value field', () => {
      const error: ValidationErrorDetail = {
        field: 'age',
        message: 'Must be 18+',
        value: 15,
      };

      const validationError = new ValidationError([error]);

      expect(validationError.errors[0].value).toBe(15);
    });

    it('should support optional constraint field', () => {
      const error: ValidationErrorDetail = {
        field: 'password',
        message: 'Too short',
        constraint: 'minLength',
      };

      const validationError = new ValidationError([error]);

      expect(validationError.errors[0].constraint).toBe('minLength');
    });

    it('should support all fields together', () => {
      const error: ValidationErrorDetail = {
        field: 'email',
        message: 'Invalid email',
        value: 'notanemail',
        constraint: 'isEmail',
      };

      const validationError = new ValidationError([error]);
      const result = validationError.errors[0];

      expect(result.field).toBe('email');
      expect(result.message).toBe('Invalid email');
      expect(result.value).toBe('notanemail');
      expect(result.constraint).toBe('isEmail');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should handle empty errors array', () => {
      const validationError = new ValidationError([]);

      expect(validationError.errors).toEqual([]);
      expect(validationError.errors.length).toBe(0);
    });

    it('should preserve error order', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'first', message: 'Error 1' },
        { field: 'second', message: 'Error 2' },
        { field: 'third', message: 'Error 3' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.errors[0].field).toBe('first');
      expect(validationError.errors[1].field).toBe('second');
      expect(validationError.errors[2].field).toBe('third');
    });

    it('should handle duplicate field names', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Required', constraint: 'isNotEmpty' },
        { field: 'email', message: 'Invalid format', constraint: 'isEmail' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.errors.length).toBe(2);
      expect(validationError.errors[0].constraint).toBe('isNotEmpty');
      expect(validationError.errors[1].constraint).toBe('isEmail');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(500);
      const errors: ValidationErrorDetail[] = [
        { field: 'field', message: longMessage },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.errors[0].message).toBe(longMessage);
      expect(validationError.errors[0].message.length).toBe(500);
    });

    it('should handle special characters in field names', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'user.profile.email[0]', message: 'Invalid' },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.errors[0].field).toBe('user.profile.email[0]');
    });

    it('should handle various value types', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'string', message: 'Invalid', value: 'text' },
        { field: 'number', message: 'Invalid', value: 123 },
        { field: 'boolean', message: 'Invalid', value: true },
        { field: 'null', message: 'Invalid', value: null },
        { field: 'undefined', message: 'Invalid', value: undefined },
        { field: 'array', message: 'Invalid', value: [1, 2, 3] },
        { field: 'object', message: 'Invalid', value: { key: 'value' } },
      ];

      const validationError = new ValidationError(errors);

      expect(validationError.errors[0].value).toBe('text');
      expect(validationError.errors[1].value).toBe(123);
      expect(validationError.errors[2].value).toBe(true);
      expect(validationError.errors[3].value).toBe(null);
      expect(validationError.errors[4].value).toBe(undefined);
      expect(validationError.errors[5].value).toEqual([1, 2, 3]);
      expect(validationError.errors[6].value).toEqual({ key: 'value' });
    });

    it('should handle large number of validation errors', () => {
      const errors: ValidationErrorDetail[] = Array.from(
        { length: 100 },
        (_, i) => ({
          field: `field${i}`,
          message: `Error ${i}`,
        }),
      );

      const validationError = new ValidationError(errors);

      expect(validationError.errors.length).toBe(100);
      expect(validationError.errors[99].field).toBe('field99');
    });
  });

  describe('Prototype Chain', () => {
    it('should maintain correct prototype chain', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'test', message: 'Test error' },
      ];
      const validationError = new ValidationError(errors);

      expect(Object.getPrototypeOf(validationError)).toBe(
        ValidationError.prototype,
      );
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof AppError).toBe(true);
      expect(validationError instanceof Error).toBe(true);
    });

    it('should be catchable as ValidationError', () => {
      const errors: ValidationErrorDetail[] = [
        { field: 'email', message: 'Invalid' },
      ];

      try {
        throw new ValidationError(errors);
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
        expect((error as ValidationError).errors).toEqual(errors);
      }
    });
  });
});
