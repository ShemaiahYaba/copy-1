// ----------------------------------------------------------------------------
// MAIN APPLICATION ENTRY POINT
// src/main.ts
// ----------------------------------------------------------------------------

// ⚠️ CRITICAL: Import instrument.ts FIRST before anything else
import './instrument';

// Now import everything else
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS if needed
  app.enableCors();

  // Start server
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
