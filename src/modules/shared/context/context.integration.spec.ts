import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ContextModule } from './context.module';
import { ContextService } from './context.service';
import { Controller, Get } from '@nestjs/common';

// Test controller that uses context
@Controller('test-context')
class TestContextController {
  constructor(private contextService: ContextService) {}

  @Get()
  getContext() {
    return this.contextService.getMeta();
  }
}

describe('Context Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ContextModule],
      controllers: [TestContextController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should receive context data from headers', () => {
    return request(app.getHttpServer())
      .get('/test-context')
      .set('x-user-id', 'test-user-123')
      .expect(200)
      .expect((res) => {
        expect(res.body.userId).toBe('test-user-123');
        expect(res.body.correlationId).toBeDefined();
      });
  });

  it('should use default values when headers missing', () => {
    return request(app.getHttpServer())
      .get('/test-context')
      .expect(200)
      .expect((res) => {
        expect(res.body.userId).toBe('anonymous');
      });
  });
});
