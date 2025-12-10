// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { EnvironmentConfig } from './config/environment';
import { corsOptions } from './config/cors';
import { setupSwagger } from './config/swagger';
import { logStartupInfo } from './utils/logger';

// ⚠️ CRITICAL: Load environment variables FIRST before anything else
EnvironmentConfig.initialize(); // Use the new config module

// ⚠️ CRITICAL: Import instrument.ts AFTER environment variables are loaded
import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Validation Pipe
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

  // CORS Configuration
  app.enableCors(corsOptions); // Use the exported options

  // Swagger Documentation Setup
  setupSwagger(app); // Use the new setup function

  // Start Server
  const port = EnvironmentConfig.getPort(); // Use the getter
  await app.listen(port);

  // Startup Logs
  await logStartupInfo(app); // Use the new logger utility
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
