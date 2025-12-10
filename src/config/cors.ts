// src/config/cors.ts
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { EnvironmentConfig } from './environment'; // Import for flexibility

export const corsOptions: CorsOptions = {
  origin: EnvironmentConfig.getFrontendUrl(), // Use the getter for flexibility
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-id',
    'x-org-id',
    'x-correlation-id',
  ],
};
