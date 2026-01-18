// src/utils/logger.ts
import { INestApplication } from '@nestjs/common';
import { EnvironmentConfig } from '../config/environment';

export async function logStartupInfo(app: INestApplication): Promise<void> {
  const appUrl = await app.getUrl();
  console.log('');
  console.log(' ============================================');
  console.log('  Application Started Successfully!🚀');
  console.log(' ============================================');
  console.log('');
  console.log(`📍 Server URL:        ${appUrl}`);
  console.log(`📚 GraphQL Playground:      ${appUrl}/graphql`);
  console.log(`📚 Swagger Docs:      ${appUrl}/api/docs`);
  console.log(`📄 OpenAPI JSON:      ${appUrl}/api/docs-json`);
  console.log(`🌍 Environment:       ${EnvironmentConfig.getNodeEnv()}`); // Use getter
  console.log(
    `🔐 Sentry Enabled:    ${EnvironmentConfig.isSentryEnabled() ? 'Yes' : 'No'}`, // Use getter
  );
  console.log('');
  console.log(' ============================================');
  console.log('');
}
