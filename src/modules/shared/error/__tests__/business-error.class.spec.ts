// ----------------------------------------------------------------------------
// BUSINESS ERROR CLASS - UNIT TESTS
// src/modules/shared/error/__tests__/business-error.class.spec.ts
// ----------------------------------------------------------------------------

import { BusinessError } from '../classes/business-error.class';
import { AppError } from '../classes/app-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';

describe('BusinessError Class', () => {
  describe('Error Creation', () => {
    it('should create with message and context', () => {
      const message = 'Cannot delete project with active tasks';
      const context = { projectId: '123', taskCount: 5 };

      const businessError = new BusinessError(message, context);

      expect(businessError).toBeInstanceOf(BusinessError);
      expect(businessError).toBeInstanceOf(AppError);
      expect(businessError.message).toBe(message);
      expect(businessError.context).toEqual(context);
    });

    it('should set correct error code', () => {
      const businessError = new BusinessError('Business rule violated');

      expect(businessError.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
    });

    it('should set MEDIUM severity', () => {
      const businessError = new BusinessError('Rule violation');

      expect(businessError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should set isOperational to true', () => {
      const businessError = new BusinessError('Operation not allowed');

      expect(businessError.isOperational).toBe(true);
    });

    it('should work without context', () => {
      const message = 'Invalid operation';
      const businessError = new BusinessError(message);

      expect(businessError.message).toBe(message);
      expect(businessError.context).toBeUndefined();
    });

    it('should preserve complex context objects', () => {
      const context = {
        user: { id: '123', role: 'admin' },
        resource: { type: 'project', id: '456' },
        attempt: 3,
      };

      const businessError = new BusinessError('Access denied', context);

      expect(businessError.context).toEqual(context);
    });
  });

  describe('invalidState() Static Method', () => {
    it('should create BusinessError with invalid_state reason', () => {
      const message = 'Cannot cancel paid order';
      const context = { orderId: '123', status: 'paid' };

      const error = BusinessError.invalidState(message, context);

      expect(error).toBeInstanceOf(BusinessError);
      expect(error.message).toBe(message);
      expect(error.context?.reason).toBe('invalid_state');
    });

    it('should merge context with reason', () => {
      const context = { userId: '456', action: 'cancel' };

      const error = BusinessError.invalidState('Invalid state', context);

      expect(error.context).toEqual({
        userId: '456',
        action: 'cancel',
        reason: 'invalid_state',
      });
    });

    it('should work with empty context', () => {
      const error = BusinessError.invalidState('Invalid state');

      expect(error.context?.reason).toBe('invalid_state');
      expect(Object.keys(error.context || {}).length).toBe(1);
    });

    it('should override reason if already in context', () => {
      const context = { reason: 'old_reason', data: 'value' };

      const error = BusinessError.invalidState('Test', context);

      expect(error.context?.reason).toBe('invalid_state');
      expect(error.context?.data).toBe('value');
    });

    it('should have correct error properties', () => {
      const error = BusinessError.invalidState('Test message');

      expect(error.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('notAllowed() Static Method', () => {
    it('should create error with operation in message', () => {
      const operation = 'delete user';
      const error = BusinessError.notAllowed(operation);

      expect(error).toBeInstanceOf(BusinessError);
      expect(error.message).toBe(`Operation '${operation}' is not allowed`);
    });

    it('should include operation in context', () => {
      const operation = 'modify settings';
      const error = BusinessError.notAllowed(operation);

      expect(error.context?.operation).toBe(operation);
    });

    it('should include reason in context when provided', () => {
      const operation = 'cancel order';
      const reason = 'Order already shipped';

      const error = BusinessError.notAllowed(operation, reason);

      expect(error.context?.operation).toBe(operation);
      expect(error.context?.reason).toBe(reason);
    });

    it('should work without reason', () => {
      const operation = 'export data';
      const error = BusinessError.notAllowed(operation);

      expect(error.context?.operation).toBe(operation);
      expect(error.context?.reason).toBeUndefined();
    });

    it('should format message correctly', () => {
      const testCases = [
        { operation: 'delete', expected: "Operation 'delete' is not allowed" },
        {
          operation: 'update user',
          expected: "Operation 'update user' is not allowed",
        },
        {
          operation: 'create project',
          expected: "Operation 'create project' is not allowed",
        },
      ];

      testCases.forEach(({ operation, expected }) => {
        const error = BusinessError.notAllowed(operation);
        expect(error.message).toBe(expected);
      });
    });

    it('should have correct error properties', () => {
      const error = BusinessError.notAllowed('test operation', 'test reason');

      expect(error.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('Inheritance from AppError', () => {
    it('should extend AppError', () => {
      const error = new BusinessError('Test error');

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof BusinessError).toBe(true);
    });

    it('should have AppError properties', () => {
      const error = new BusinessError('Test');

      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('severity');
      expect(error).toHaveProperty('context');
      expect(error).toHaveProperty('isOperational');
      expect(error).toHaveProperty('timestamp');
    });

    it('should have toJSON method from AppError', () => {
      const error = new BusinessError('Test error', { data: 'value' });
      const json = error.toJSON();

      expect(json).toHaveProperty('status', 'error');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('context');
      expect(json).toHaveProperty('timestamp');
    });

    it('should capture stack trace', () => {
      const error = new BusinessError('Test error');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toContain('BusinessError');
    });
  });

  describe('Use Cases', () => {
    it('should handle workflow violations', () => {
      const error = new BusinessError('Cannot approve rejected document', {
        documentId: 'doc-123',
        currentStatus: 'rejected',
        attemptedStatus: 'approved',
      });

      expect(error.message).toContain('Cannot approve rejected document');
      expect(error.context?.currentStatus).toBe('rejected');
      expect(error.context?.attemptedStatus).toBe('approved');
    });

    it('should handle quota violations', () => {
      const error = new BusinessError('User has exceeded project limit', {
        userId: 'user-456',
        currentProjects: 10,
        maxProjects: 10,
      });

      expect(error.message).toContain('exceeded project limit');
      expect(error.context?.currentProjects).toBe(10);
      expect(error.context?.maxProjects).toBe(10);
    });

    it('should handle dependency conflicts', () => {
      const error = new BusinessError(
        'Cannot delete user with active subscriptions',
        {
          userId: 'user-789',
          activeSubscriptions: ['sub-1', 'sub-2'],
        },
      );

      expect(error.message).toContain('Cannot delete user');
      expect(error.context?.activeSubscriptions).toHaveLength(2);
    });

    it('should handle state transition errors', () => {
      const error = BusinessError.invalidState(
        'Cannot transition from draft to archived',
        {
          currentState: 'draft',
          targetState: 'archived',
          allowedTransitions: ['draft -> published', 'draft -> deleted'],
        },
      );

      expect(error.message).toContain('Cannot transition');
      expect(error.context?.reason).toBe('invalid_state');
      expect(error.context?.currentState).toBe('draft');
    });

    it('should handle permission errors', () => {
      const error = BusinessError.notAllowed(
        'delete project',
        'Insufficient permissions',
      );

      expect(error.message).toContain(
        "Operation 'delete project' is not allowed",
      );
      expect(error.context?.reason).toBe('Insufficient permissions');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string message', () => {
      const error = new BusinessError('');

      expect(error.message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(500);
      const error = new BusinessError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(500);
    });

    it('should handle special characters in message', () => {
      const message = 'Error with <>&"\' characters';
      const error = new BusinessError(message);

      expect(error.message).toBe(message);
    });

    it('should handle null values in context', () => {
      const context = {
        value: null,
        userId: '123',
      };

      const error = new BusinessError('Test', context);

      expect(error.context?.value).toBe(null);
      expect(error.context?.userId).toBe('123');
    });

    it('should handle arrays in context', () => {
      const context = {
        items: [1, 2, 3],
        tags: ['urgent', 'backend'],
      };

      const error = new BusinessError('Test', context);

      expect(error.context?.items).toEqual([1, 2, 3]);
      expect(error.context?.tags).toEqual(['urgent', 'backend']);
    });

    it('should handle deeply nested context', () => {
      const context = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const error = new BusinessError('Test', context);

      expect(error.context?.level1?.level2?.level3?.value).toBe('deep');
    });

    it('should handle empty operation name', () => {
      const error = BusinessError.notAllowed('');

      expect(error.message).toBe("Operation '' is not allowed");
    });

    it('should handle operations with special characters', () => {
      const operation = 'delete user <admin>';
      const error = BusinessError.notAllowed(operation);

      expect(error.message).toContain(operation);
    });
  });

  describe('Prototype Chain', () => {
    it('should maintain correct prototype chain', () => {
      const error = new BusinessError('Test');

      expect(Object.getPrototypeOf(error)).toBe(BusinessError.prototype);
      expect(error instanceof BusinessError).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should be catchable as BusinessError', () => {
      try {
        throw new BusinessError('Test error', { data: 'value' });
      } catch (error) {
        expect(error instanceof BusinessError).toBe(true);
        expect((error as BusinessError).context?.data).toBe('value');
      }
    });

    it('should be catchable as AppError', () => {
      try {
        throw new BusinessError('Test error');
      } catch (error) {
        expect(error instanceof AppError).toBe(true);
        expect((error as AppError).code).toBe(
          ERROR_CODES.BUSINESS_RULE_VIOLATION,
        );
      }
    });
  });

  describe('Factory Methods Comparison', () => {
    it('should differentiate between invalidState and notAllowed', () => {
      const stateError = BusinessError.invalidState('Cannot proceed');
      const permissionError = BusinessError.notAllowed('proceed');

      expect(stateError.context?.reason).toBe('invalid_state');
      expect(permissionError.context?.operation).toBe('proceed');
      expect(stateError.message).not.toContain("Operation '");
      expect(permissionError.message).toContain("Operation '");
    });

    it('should use same error code for all factory methods', () => {
      const error1 = new BusinessError('Test');
      const error2 = BusinessError.invalidState('Test');
      const error3 = BusinessError.notAllowed('test');

      expect(error1.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
      expect(error2.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
      expect(error3.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
    });

    it('should use same severity for all factory methods', () => {
      const error1 = new BusinessError('Test');
      const error2 = BusinessError.invalidState('Test');
      const error3 = BusinessError.notAllowed('test');

      expect(error1.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error2.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error3.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });
});
