// src/config/swagger.ts
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  ClientProfileDto,
  SupervisorProfileDto,
  StudentProfileDto,
  UniversityProfileDto,
} from '../modules/core/auth/dto/register.dto'; // Adjust path if necessary

// Define your custom CSS and JS as constants for clarity
const customCss = `
      :root {
        --primary: #4f46e5;
        --primary-dark: #4338ca;
        --secondary: #10b981;
        --dark: #1f2937;
        --light: #f9fafb;
        --border: #e5e7eb;
      }

      .swagger-ui {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .swagger-ui .topbar {
        background: var(--dark);
        padding: 15px 0;
        border-bottom: 1px solid var(--border);
      }

      .swagger-ui .topbar-wrapper {
        align-items: center;
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 20px;
      }

      .swagger-ui .topbar .link {
        display: flex;
        align-items: center;
      }

      .swagger-ui .topbar .link img {
        height: 40px;
      }

      .swagger-ui .wrapper {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 20px;
      }

      .swagger-ui .info {
        margin: 20px 0 30px;
        padding: 20px;
        border-radius: 8px;
        background: var(--light);
        border: 1px solid var(--border);
      }

      .swagger-ui .info hgroup.main {
        margin-bottom: 20px;
      }

      .swagger-ui .info h1 {
        color: var(--dark);
        font-size: 1.8em;
        margin: 0;
      }

      .swagger-ui .info .description {
        font-size: 1.1em;
        line-height: 1.6;
      }

      .swagger-ui .opblock-tag {
        margin: 0 0 10px 0;
        padding: 10px 15px;
        background: var(--light);
        border-radius: 6px;
        border: 1px solid var(--border);
        transition: all 0.2s ease;
      }

      .swagger-ui .opblock-tag:hover {
        background: #f3f4f6;
      }

      .swagger-ui .opblock {
        margin-bottom: 15px;
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }

      .swagger-ui .opblock .opblock-summary {
        padding: 10px 15px;
      }

      .swagger-ui .opblock .opblock-summary-method {
        min-width: 80px;
        padding: 6px 10px;
        font-weight: 600;
        text-align: center;
        border-radius: 4px;
        font-size: 0.9em;
        text-shadow: none;
      }

      .swagger-ui .opblock.opblock-get .opblock-summary-method {
        background: #60a5fa;
      }

      .swagger-ui .opblock.opblock-post .opblock-summary-method {
        background: #34d399;
      }

      .swagger-ui .opblock.opblock-put .opblock-summary-method,
      .swagger-ui .opblock.opblock-patch .opblock-summary-method {
        background: #fbbf24;
      }

      .swagger-ui .opblock.opblock-delete .opblock-summary-method {
        background: #f87171;
      }

      .swagger-ui .opblock .opblock-section {
        background: #fff;
      }

      .swagger-ui .opblock .opblock-section-header {
        background: #f9fafb;
        box-shadow: none;
        border-bottom: 1px solid var(--border);
      }

      .swagger-ui .responses-inner {
        padding: 15px;
      }

      .swagger-ui .response-col_status {
        font-weight: 600;
      }

      .swagger-ui .response-col_status .response-undocumented {
        color: #6b7280;
      }

      .swagger-ui .btn {
        border-radius: 4px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .swagger-ui .btn.execute {
        background: var(--primary);
        border-color: var(--primary);
      }

      .swagger-ui .btn.execute:hover {
        background: var(--primary-dark);
        border-color: var(--primary-dark);
      }

      .swagger-ui .model-box {
        background: #f9fafb;
        border-radius: 4px;
        padding: 10px;
        margin-top: 10px;
        border: 1px solid var(--border);
      }

      @media (max-width: 768px) {
        .swagger-ui .wrapper {
          padding: 0 15px;
        }

        .swagger-ui .opblock .opblock-summary-method {
          min-width: 60px;
          padding: 4px 8px;
          font-size: 0.8em;
        }
      }

      .swagger-ui .topbar {
        position: relative;
        padding: 0;
      }

      .swagger-ui .topbar .topbar-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 30px;
        max-width: 100%;
      }

      .swagger-ui .topbar .topbar-wrapper::after {
        content: 'Gradlinq API';
        color: white;
        font-size: 1.5em;
        font-weight: 600;
        margin-left: 15px;
      }

      .swagger-ui .info .title small {
        background: var(--secondary);
      }
    `;

const customJs = `
      document.addEventListener('DOMContentLoaded', function() {
        const title = document.querySelector('.info .title');
        if (title) {
          const version = document.createElement('span');
          version.className = 'version';
          version.textContent = 'v2.0.0';
          version.style.cssText = 'margin-left: 10px; font-size: 0.6em; vertical-align: middle; background: #4f46e5; color: white; padding: 2px 8px; border-radius: 20px;';
          title.appendChild(version);
        }

        const loading = document.createElement('div');
        loading.id = 'swagger-loading';
        loading.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, #4f46e5, #10b981); z-index: 9999; display: none;';
        document.body.appendChild(loading);

        document.addEventListener('swagger:request', function() {
          const loadingEl = document.getElementById('swagger-loading');
          if (loadingEl) loadingEl.style.display = 'block';
        });

        document.addEventListener('swagger:response', function() {
          const loadingEl = document.getElementById('swagger-loading');
          if (loadingEl) loadingEl.style.display = 'none';
        });
      });
    `;

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
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
    .setVersion('1.0.0')
    .setContact(
      'Gradlinq Support',
      'https://gradlinq.com',
      'support@gradlinq.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT') // Note: Removed trailing spaces
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
      'JWT-auth',
    )
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://gradlinq.fly.dev/', 'Production') // Note: Removed trailing spaces
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    extraModels: [
      ClientProfileDto,
      SupervisorProfileDto,
      StudentProfileDto,
      UniversityProfileDto,
    ],
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      operationsSorter: 'method',
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: 3,
      displayOperationId: false,
      showExtensions: true,
      showCommonExtensions: true,
      tagsSorter: (a: string, b: string): number => {
        const order = [
          'auth',
          'users',
          'projects',
          'students',
          'supervisors',
          'universities',
        ];
        return order.indexOf(a) - order.indexOf(b);
      },
    },
    customCss,
    customSiteTitle: 'Gradlinq API',
    customfavIcon: 'https://gradlinq.com/favicon.ico', // Note: Removed trailing spaces
    customJs,
  });
}
