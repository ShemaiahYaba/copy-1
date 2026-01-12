// ============================================================================
// PART 10: INTEGRATION TESTS
// src/modules/bookmarks/bookmarks.integration.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { BookmarksModule } from '../bookmarks.module';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';

describe('Bookmarks Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        BookmarksModule,
        DatabaseModule,
        ContextModule,
        NotificationModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  // Add more integration tests here
  // Test GraphQL queries/mutations with real database
});
