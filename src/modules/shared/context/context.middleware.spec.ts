import { ContextMiddleware } from './context.middleware';

describe('ContextMiddleware', () => {
  it('should be defined', () => {
    expect(new ContextMiddleware()).toBeDefined();
  });
});
