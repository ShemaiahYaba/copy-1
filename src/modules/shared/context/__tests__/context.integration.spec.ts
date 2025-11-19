// ----------------------------------------------------------------------------
// 3. INTEGRATION TESTS - context.integration.spec.ts
// ----------------------------------------------------------------------------
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { ContextModule } from '../context.module';
import { ContextService } from '../context.service';
import {
  ContextStorageAdapter,
  HeaderNamesDto,
  UserIdSource,
} from '../dto/context-config.dto';

@Controller('test-context')
class TestContextController {
  constructor(private contextService: ContextService) {}

  @Get()
  getContext() {
    return this.contextService.getMeta();
  }

  @Get('user-id')
  getUserId() {
    return { userId: this.contextService.getUserId() };
  }

  @Get('org-id')
  getOrgId() {
    return { orgId: this.contextService.getOrgId() };
  }

  @Get('correlation-id')
  getCorrelationId() {
    return { correlationId: this.contextService.getCorrelationId() };
  }
}

describe('Context Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ContextModule.register({
          adapter: ContextStorageAdapter.CLS,
          userIdSource: UserIdSource.HEADER,
          includeRequestDetails: true,
          includeIp: true,
          autoGenerate: false,
          includeUserAgent: false,
          headerNames: new HeaderNamesDto(),
        }),
      ],
      controllers: [TestContextController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('SIMPLE: should have ClsService available', () => {
    const contextService = app.get(ContextService);
    expect(contextService).toBeDefined();

    // Manually set context
    contextService.setMeta({
      userId: 'manual-user',
      correlationId: 'manual-corr',
      timestamp: new Date(),
    });

    const meta = contextService.getMeta();
    console.log('Manually set context:', meta);
  });

  it('should receive context data from headers', () => {
    return request(app.getHttpServer())
      .get('/test-context')
      .set('x-user-id', 'test-user-123')
      .set('x-org-id', 'test-org-456')
      .expect(200)
      .expect((res) => {
        expect(res.body.userId).toBe('test-user-123');
        expect(res.body.orgId).toBe('test-org-456');
        expect(res.body.correlationId).toBeDefined();
      });
  });

  it('should generate correlation ID automatically', () => {
    return request(app.getHttpServer())
      .get('/test-context')
      .expect(200)
      .expect((res) => {
        expect(res.body.correlationId).toBeDefined();
        expect(typeof res.body.correlationId).toBe('string');
      });
  });

  it('should include request details', () => {
    return request(app.getHttpServer())
      .get('/test-context')
      .expect(200)
      .expect((res) => {
        expect(res.body.path).toBe('/test-context');
        expect(res.body.method).toBe('GET');
      });
  });

  it('should isolate contexts between requests', async () => {
    const response1 = await request(app.getHttpServer())
      .get('/test-context')
      .set('x-user-id', 'user-1');

    const response2 = await request(app.getHttpServer())
      .get('/test-context')
      .set('x-user-id', 'user-2');

    expect(response1.body.userId).toBe('user-1');
    expect(response2.body.userId).toBe('user-2');
    expect(response1.body.correlationId).not.toBe(response2.body.correlationId);
  });
});
