// ----------------------------------------------------------------------------
// APP MODULE - UPDATED WITH SENTRY
// src/app.module.ts
// ----------------------------------------------------------------------------

import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { EnvironmentConfig } from './config/environment';
import { Request } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ErrorModule } from './modules/shared/error/error.module';
import { NotificationModule } from './modules/shared/notification/notification.module';
import { ErrorNotificationStrategy } from './modules/shared/error/dto/error-config.dto';
import { NotificationAdapter } from '@modules/shared/notification/dto';
import { AuthModule } from '@modules/core/auth/auth.module';
import { ProjectsModule } from '@core/projects/projects.module';
import { ExperiencesModule } from '@core/experiences/experiences.module';
import { TeamsModule } from '@core/teams/teams.module';
import { StudentsModule } from '@modules/students/students.module';

import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    // 1. Sentry Module (setup must come early)
    SentryModule.forRoot(),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',

      autoSchemaFile: join(process.cwd(), 'schema.gql'),

      // ✅ dev-only UI, always allow introspection in dev
      playground: EnvironmentConfig.getNodeEnv() !== 'production',
      introspection: EnvironmentConfig.getNodeEnv() !== 'production',

      // allow guards/auth later
      context: (ctx: { req: Request }) => ({ req: ctx.req }),
    }),

    // 2. Notification Module (ErrorModule depends on it)
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: true,
      enableLogging: process.env.NODE_ENV === 'development',
    }),

    // 3. Error Module
    ErrorModule.register({
      includeStackTrace: process.env.NODE_ENV === 'development',
      notifyFrontend: true,
      notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
      logErrors: true,
      captureContext: true,
      enableSentry:
        process.env.NODE_ENV === 'production' ||
        process.env.SENTRY_ENABLED === 'true',
    }),
    DatabaseModule,
    AuthModule,
    ProjectsModule,
    ExperiencesModule,
    TeamsModule,
    StudentsModule,

    // 4. Your other modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
