// ----------------------------------------------------------------------------
// MAIN APPLICATION ENTRY POINT
// src/main.ts
// ----------------------------------------------------------------------------

// ⚠️ CRITICAL: Import instrument.ts FIRST before anything else
import './instrument';

// Now import everything else
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================================================
  // GLOBAL VALIDATION PIPE
  // ============================================================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ============================================================================
  // CORS CONFIGURATION
  // ============================================================================
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'x-org-id',
      'x-correlation-id',
    ],
  });

  // ============================================================================
  // SWAGGER DOCUMENTATION SETUP
  // ============================================================================
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gradlinq API')
    .setDescription(
      `
# Gradlinq API Documentation

Enterprise-grade API for managing student internships, projects, and university collaborations.

## Features
- **Supabase Authentication** - Secure JWT-based authentication
- **4 User Roles** - Client, Supervisor, Student, University
- **Real-time Notifications** - WebSocket-based notifications
- **Error Handling** - Standardized error responses with Sentry integration
- **Type Safety** - Full TypeScript support

## Authentication
Most endpoints require a JWT token. After logging in or registering, use the \`access_token\` from the response.

Click the 🔓 **Authorize** button above and enter: \`Bearer YOUR_ACCESS_TOKEN\`

## Support
- **Documentation**: [API Docs](https://docs.gradlinq.com)
- **Email**: support@gradlinq.com
    `.trim(),
    )
    .setVersion('2.0.0')
    .setContact(
      'Gradlinq Support',
      'https://gradlinq.com',
      'support@gradlinq.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('auth', 'Authentication and user management endpoints')
    .addTag('projects', 'Project management endpoints (coming soon)')
    .addTag('students', 'Student management endpoints (coming soon)')
    .addTag('supervisors', 'Supervisor management endpoints (coming soon)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth', // This name must match @ApiBearerAuth() in decorators
    )
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.gradlinq.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Setup Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep auth token after page refresh
      tagsSorter: 'alpha', // Sort tags alphabetically
      operationsSorter: 'alpha', // Sort operations alphabetically
      docExpansion: 'none', // Collapse all sections by default
      filter: true, // Enable search filter
      tryItOutEnabled: true, // Enable "Try it out" by default
      displayRequestDuration: true, // Show request duration
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0 }
    `,
    customSiteTitle: 'Gradlinq API Documentation',
    customfavIcon: 'https://gradlinq.com/favicon.ico',
  });

  // ============================================================================
  // START SERVER
  // ============================================================================
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // ============================================================================
  // STARTUP LOGS
  // ============================================================================
  const appUrl = await app.getUrl();
  console.log('');
  console.log('🚀 ============================================');
  console.log('🚀  Application Started Successfully!');
  console.log('🚀 ============================================');
  console.log('');
  console.log(`📍 Server URL:        ${appUrl}`);
  console.log(`📚 Swagger Docs:      ${appUrl}/api/docs`);
  console.log(`📄 OpenAPI JSON:      ${appUrl}/api/docs-json`);
  console.log(`🌍 Environment:       ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔐 Sentry Enabled:    ${process.env.SENTRY_ENABLED === 'true' ? 'Yes' : 'No'}`,
  );
  console.log('');
  console.log('🚀 ============================================');
  console.log('');
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
