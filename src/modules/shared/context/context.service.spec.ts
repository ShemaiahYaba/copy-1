import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from './context.service';

describe('ContextService', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [ContextService],
    }).compile();
  });

  // Clean up after each test
  afterEach(async () => {
    await module.close();
  });

  it('should be defined', async () => {
    const service = await module.resolve<ContextService>(ContextService);
    expect(service).toBeDefined();
  });

  it('should store and retrieve meta data', async () => {
    const service = await module.resolve<ContextService>(ContextService);
    const testData = { userId: '123', orgId: 'org-456' };

    service.setMeta(testData);
    const result = service.getMeta();

    expect(result).toEqual(testData);
  });

  it('should return empty object initially', async () => {
    const service = await module.resolve<ContextService>(ContextService);
    const result = service.getMeta();
    expect(result).toEqual({});
  });

  it('should overwrite meta when setMeta is called again', async () => {
    const service = await module.resolve<ContextService>(ContextService);
    service.setMeta({ userId: 'first' });
    service.setMeta({ userId: 'second', orgId: 'org-123' });

    const result = service.getMeta();

    expect(result).toEqual({ userId: 'second', orgId: 'org-123' });
  });

  it('should have separate instances for each resolve', async () => {
    const service1 = await module.resolve<ContextService>(ContextService);
    const service2 = await module.resolve<ContextService>(ContextService);

    service1.setMeta({ userId: 'user1' });
    service2.setMeta({ userId: 'user2' });

    // Each instance should have its own data
    expect(service1.getMeta()).toEqual({ userId: 'user1' });
    expect(service2.getMeta()).toEqual({ userId: 'user2' });
  });
});
