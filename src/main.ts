// ----------------------------------------------------------------------------
// MAIN APPLICATION ENTRY POINT WITH SWAGGER
// src/main.ts
// ----------------------------------------------------------------------------

// ⚠️ CRITICAL: Import instrument.ts FIRST before anything else
import './instrument';

// Now import everything else
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-User-Id',
      'X-Org-Id',
      'X-Correlation-Id',
    ],
  });

  // ============================================================================
  // SWAGGER / OPENAPI DOCUMENTATION
  // ============================================================================
  const config = new DocumentBuilder()
    .setTitle('Gradlinq API')
    .setDescription(
      'Complete API documentation for Gradlinq - An enterprise-grade platform for managing student internships, university partnerships, and client projects.',
    )
    .setVersion('2.0.0')
    .setContact(
      'Gradlinq Support',
      'https://gradlinq.com',
      'support@gradlinq.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api-staging.gradlinq.com', 'Staging')
    .addServer('https://api.gradlinq.com', 'Production')

    // ============================================================================
    // AUTHENTICATION SCHEMES
    // ============================================================================
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT', // This name must match the one used in @ApiBearerAuth()
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for external integrations',
      },
      'API-Key',
    )

    // ============================================================================
    // GLOBAL TAGS (Organized by Feature)
    // ============================================================================
    .addTag('auth', 'Authentication and authorization endpoints')
    .addTag('users', 'User management and profiles')
    .addTag('projects', 'Project management')
    .addTag('tasks', 'Task management')
    .addTag('clients', 'Client management')
    .addTag('supervisors', 'Supervisor management')
    .addTag('students', 'Student management')
    .addTag('universities', 'University management')
    .addTag('notifications', 'Real-time notifications')
    .addTag('admin', 'Administrative endpoints')

    // ============================================================================
    // EXTERNAL DOCUMENTATION
    // ============================================================================
    .setExternalDoc('Full Documentation', 'https://docs.gradlinq.com')

    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // ============================================================================
    // SWAGGER OPTIONS
    // ============================================================================
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,

    // Include all modules
    include: [],

    // Deep scan for all decorators
    deepScanRoutes: true,

    // Ignore global prefix if you have one
    ignoreGlobalPrefix: false,

    // Extra models to include (if you have shared DTOs)
    extraModels: [
      // Add any shared DTOs here if needed
      // Example: SharedResponseDto, PaginatedResponseDto, etc.
    ],
  });

  // ============================================================================
  // CUSTOMIZE SWAGGER UI
  // ============================================================================
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Gradlinq API Documentation',
    customfavIcon: 'https://gradlinq.com/favicon.ico',
    customCss: `
      .swagger-ui .topbar { 
        background-color: #2c3e50; 
      }
      .swagger-ui .topbar-wrapper img { 
        content: url('https://gradlinq.com/logo.png'); 
      }
      .swagger-ui .scheme-container {
        background: #fafafa;
        padding: 20px;
        margin: 20px 0;
      }
    `,
    swaggerOptions: {
      persistAuthorization: true, // Remember auth tokens
      displayRequestDuration: true, // Show request timing
      filter: true, // Enable search/filter
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list', // 'list' | 'full' | 'none'
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      tryItOutEnabled: true,
      requestSnippetsEnabled: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
      tagsSorter: 'alpha', // Sort tags alphabetically
      operationsSorter: 'alpha', // Sort operations alphabetically
    },
  });

  // ============================================================================
  // START SERVER
  // ============================================================================
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // ============================================================================
  // STARTUP LOGS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('🚀 Gradlinq API Server Started Successfully');
  console.log('='.repeat(80));
  console.log(`📍 Server URL:        http://localhost:${port}`);
  console.log(`📖 API Documentation: http://localhost:${port}/api`);
  console.log(`📊 Swagger JSON:      http://localhost:${port}/api-json`);
  console.log(`🌍 Environment:       ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔐 Sentry:            ${process.env.SENTRY_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`,
  );
  console.log('='.repeat(80) + '\n');

  // ============================================================================
  // GRACEFUL SHUTDOWN
  // ============================================================================
  const handleShutdown = (signal: string) => {
    console.log(`📥 ${signal} received. Shutting down gracefully...`);
    app
      .close()
      .then(() => {
        console.log('✅ Application closed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('❌ Fatal error during bootstrap:', error);
  process.exit(1);
});
