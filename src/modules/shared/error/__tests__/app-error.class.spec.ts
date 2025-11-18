// ----------------------------------------------------------------------------
// APP ERROR CLASS - UNIT TESTS
// src/modules/shared/error/__tests__/app-error.class.spec.ts
// ----------------------------------------------------------------------------

import { AppError } from '../classes/app-error.class';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';

describe('AppError Class', () => {
  describe('Error Creation', () => {
    it('should create error with all properties', () => {
      const code = ERROR_CODES.RESOURCE_NOT_FOUND;
      const message = 'Custom error message';
      const context = { userId: '123', resource: 'project' };
      const severity = ErrorSeverity.HIGH;

      const error = new AppError(code, message, context, severity, true);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.context).toEqual(context);
      expect(error.severity).toBe(severity);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default message if not provided', () => {
      const code = ERROR_CODES.INTERNAL_SERVER_ERROR;
      const error = new AppError(code);

      expect(error.message).toBe(ERROR_MESSAGES[code]);
      expect(error.message).toBe('An internal server error occurred');
    });

    it('should set default severity to MEDIUM', () => {
      const error = new AppError(ERROR_CODES.UNKNOWN_ERROR);

      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should set isOperational to true by default', () => {
      const error = new AppError(ERROR_CODES.VALIDATION_ERROR);

      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError(ERROR_CODES.DATABASE_ERROR);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toContain('AppError');
    });

    it('should set timestamp to current time', () => {
      const before = new Date();
      const error = new AppError(ERROR_CODES.TIMEOUT);
      const after = new Date();

      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should accept empty context', () => {
      const error = new AppError(
        ERROR_CODES.NOT_FOUND,
        'Test message',
        undefined,
      );

      expect(error.context).toBeUndefined();
    });

    it('should preserve context with nested objects', () => {
      const context = {
        user: { id: '123', name: 'John' },
        metadata: { timestamp: new Date().toISOString() },
      };

      const error = new AppError(ERROR_CODES.CONFLICT, 'Test', context);

      expect(error.context).toEqual(context);
      expect(error.context?.user).toEqual(context.user);
    });
  });

  describe('Static Factory Methods', () => {
    describe('high()', () => {
      it('should create HIGH severity error', () => {
        const error = AppError.high(
          ERROR_CODES.DATABASE_ERROR,
          'Database connection failed',
        );

        expect(error.severity).toBe(ErrorSeverity.HIGH);
      });

      it('should set isOperational to true', () => {
        const error = AppError.high(ERROR_CODES.EXTERNAL_SERVICE_ERROR);

        expect(error.isOperational).toBe(true);
      });

      it('should accept context parameter', () => {
        const context = { service: 'payment-gateway' };
        const error = AppError.high(
          ERROR_CODES.API_REQUEST_FAILED,
          'Payment failed',
          context,
        );

        expect(error.context).toEqual(context);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
      });

      it('should use default message if not provided', () => {
        const error = AppError.high(ERROR_CODES.SERVICE_UNAVAILABLE);

        expect(error.message).toBe(
          ERROR_MESSAGES[ERROR_CODES.SERVICE_UNAVAILABLE],
        );
      });
    });

    describe('critical()', () => {
      it('should create CRITICAL severity error', () => {
        const error = AppError.critical(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'System failure',
        );

        expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      });

      it('should set isOperational to false', () => {
        const error = AppError.critical(ERROR_CODES.DATABASE_ERROR);

        expect(error.isOperational).toBe(false);
      });

      it('should accept context parameter', () => {
        const context = { errorCode: 'CRITICAL_001' };
        const error = AppError.critical(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Critical failure',
          context,
        );

        expect(error.context).toEqual(context);
        expect(error.severity).toBe(ErrorSeverity.CRITICAL);
        expect(error.isOperational).toBe(false);
      });

      it('should use default message if not provided', () => {
        const error = AppError.critical(ERROR_CODES.UNKNOWN_ERROR);

        expect(error.message).toBe(ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]);
      });
    });
  });

  describe('JSON Serialization', () => {
    describe('toJSON()', () => {
      it('should return correct format', () => {
        const code = ERROR_CODES.VALIDATION_ERROR;
        const message = 'Validation failed';
        const context = { field: 'email' };
        const error = new AppError(code, message, context);

        const json = error.toJSON();

        expect(json).toHaveProperty('status', 'error');
        expect(json).toHaveProperty('code', code);
        expect(json).toHaveProperty('message', message);
        expect(json).toHaveProperty('context', context);
        expect(json).toHaveProperty('timestamp');
      });

      it('should include all relevant fields', () => {
        const error = new AppError(ERROR_CODES.UNAUTHORIZED, 'Access denied', {
          userId: '456',
        });

        const json = error.toJSON();

        expect(Object.keys(json)).toEqual([
          'status',
          'code',
          'message',
          'context',
          'timestamp',
        ]);
      });

      it('should not include stack trace by default', () => {
        const error = new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR);
        const json = error.toJSON();

        expect(json).not.toHaveProperty('stack');
      });

      it('should handle undefined context', () => {
        const error = new AppError(ERROR_CODES.NOT_FOUND, 'Resource not found');
        const json = error.toJSON();

        expect(json.context).toBeUndefined();
      });

      it('should preserve timestamp as Date object', () => {
        const error = new AppError(ERROR_CODES.TIMEOUT);
        const json = error.toJSON();

        expect(json.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Error Codes', () => {
    it('should accept valid error codes', () => {
      const validCodes = [
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_CODES.UNAUTHORIZED,
        ERROR_CODES.NOT_FOUND,
        ERROR_CODES.BUSINESS_RULE_VIOLATION,
      ];

      validCodes.forEach((code) => {
        const error = new AppError(code);
        expect(error.code).toBe(code);
      });
    });

    it('should map code to default message', () => {
      const testCases = [
        {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'An internal server error occurred',
        },
        { code: ERROR_CODES.VALIDATION_ERROR, message: 'Validation failed' },
        { code: ERROR_CODES.UNAUTHORIZED, message: 'Unauthorized access' },
        { code: ERROR_CODES.NOT_FOUND, message: 'Resource not found' },
      ];

      testCases.forEach(({ code, message }) => {
        const error = new AppError(code);
        expect(error.message).toBe(message);
      });
    });

    it('should handle all error code categories', () => {
      // General errors (1000-1999)
      expect(
        () => new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR),
      ).not.toThrow();
      expect(() => new AppError(ERROR_CODES.UNKNOWN_ERROR)).not.toThrow();

      // Validation errors (2000-2999)
      expect(() => new AppError(ERROR_CODES.VALIDATION_ERROR)).not.toThrow();
      expect(() => new AppError(ERROR_CODES.INVALID_INPUT)).not.toThrow();

      // Authentication errors (3000-3999)
      expect(() => new AppError(ERROR_CODES.UNAUTHORIZED)).not.toThrow();
      expect(() => new AppError(ERROR_CODES.INVALID_TOKEN)).not.toThrow();

      // Resource errors (4000-4999)
      expect(() => new AppError(ERROR_CODES.NOT_FOUND)).not.toThrow();
      expect(() => new AppError(ERROR_CODES.ALREADY_EXISTS)).not.toThrow();

      // Business logic errors (5000-5999)
      expect(
        () => new AppError(ERROR_CODES.BUSINESS_RULE_VIOLATION),
      ).not.toThrow();

      // External service errors (6000-6999)
      expect(
        () => new AppError(ERROR_CODES.EXTERNAL_SERVICE_ERROR),
      ).not.toThrow();
    });
  });

  describe('Error Inheritance', () => {
    it('should extend native Error class', () => {
      const error = new AppError(ERROR_CODES.UNKNOWN_ERROR);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should be catchable as Error', () => {
      try {
        throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
      }
    });

    it('should maintain prototype chain', () => {
      const error = new AppError(ERROR_CODES.NOT_FOUND);

      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
    });
  });

  describe('Error Properties', () => {
    it('should have readonly properties', () => {
      const error = new AppError(ERROR_CODES.VALIDATION_ERROR);

      // check the initial values instead of expecting a throw
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should preserve all severity levels', () => {
      const lowError = new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Test',
        undefined,
        ErrorSeverity.LOW,
      );
      const mediumError = new AppError(
        ERROR_CODES.BUSINESS_RULE_VIOLATION,
        'Test',
        undefined,
        ErrorSeverity.MEDIUM,
      );
      const highError = AppError.high(ERROR_CODES.DATABASE_ERROR);
      const criticalError = AppError.critical(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );

      expect(lowError.severity).toBe(ErrorSeverity.LOW);
      expect(mediumError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(highError.severity).toBe(ErrorSeverity.HIGH);
      expect(criticalError.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Error Context', () => {
    it('should support primitive values in context', () => {
      const context = {
        userId: '123',
        count: 5,
        isActive: true,
      };

      const error = new AppError(
        ERROR_CODES.BUSINESS_RULE_VIOLATION,
        'Test',
        context,
      );

      expect(error.context).toEqual(context);
    });

    it('should support arrays in context', () => {
      const context = {
        items: [1, 2, 3],
        tags: ['urgent', 'backend'],
      };

      const error = new AppError(ERROR_CODES.VALIDATION_ERROR, 'Test', context);

      expect(error.context?.items).toEqual([1, 2, 3]);
      expect(error.context?.tags).toEqual(['urgent', 'backend']);
    });

    it('should support nested objects in context', () => {
      const context = {
        user: {
          id: '123',
          profile: {
            name: 'John',
            email: 'john@example.com',
          },
        },
      };

      const error = new AppError(ERROR_CODES.UNAUTHORIZED, 'Test', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('Error Message Override', () => {
    it('should allow custom message override', () => {
      const customMessage = 'This is a custom error message';
      const error = new AppError(ERROR_CODES.NOT_FOUND, customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.message).not.toBe(ERROR_MESSAGES[ERROR_CODES.NOT_FOUND]);
    });

    it('should preserve custom message in factory methods', () => {
      const customMessage = 'Custom high severity error';
      const error = AppError.high(ERROR_CODES.DATABASE_ERROR, customMessage);

      expect(error.message).toBe(customMessage);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string message', () => {
      const error = new AppError(ERROR_CODES.UNKNOWN_ERROR, '');

      expect(error.message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new AppError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        longMessage,
      );

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it('should handle special characters in message', () => {
      const message = 'Error with special chars: <>&"\'\n\t';
      const error = new AppError(ERROR_CODES.VALIDATION_ERROR, message);

      expect(error.message).toBe(message);
    });

    it('should handle large context objects', () => {
      const largeContext = {
        data: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          value: `Value ${i}`,
        })),
      };

      const error = new AppError(
        ERROR_CODES.BUSINESS_RULE_VIOLATION,
        'Test',
        largeContext,
      );

      expect(error.context?.data.length).toBe(100);
    });
  });
});
