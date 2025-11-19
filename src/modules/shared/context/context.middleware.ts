// ----------------------------------------------------------------------------
// 7. CONTEXT MIDDLEWARE - context.middleware.ts
// ----------------------------------------------------------------------------
import { Injectable, NestMiddleware, Inject, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ContextService } from './context.service';
import { ContextConfigDto } from './dto/context-config.dto';
import { ContextMeta } from './interfaces/context-meta.interface';
import { UserIdSource } from './dto/context-config.dto';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ContextMiddleware.name);

  constructor(
    private readonly contextService: ContextService,
    @Inject('CONTEXT_CONFIG') private readonly config: ContextConfigDto,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const meta: ContextMeta = {
        correlationId: this.extractCorrelationId(req),
        timestamp: new Date(),
      };

      // Extract user information
      if (this.config.userIdSource === UserIdSource.HEADER) {
        meta.userId = req.headers[this.config.headerNames.userId] as string;
        meta.orgId = req.headers[this.config.headerNames.orgId] as string;
      } else if (this.config.userIdSource === UserIdSource.JWT) {
        // Extract from JWT (req.user should be set by auth guard)
        const user = (req as any).user;
        if (user) {
          meta.userId = user.id || user.userId || user.sub;
          meta.orgId = user.orgId || user.organizationId;
          meta.username = user.username || user.name;
          meta.email = user.email;
        }
      }

      // Add request details
      if (this.config.includeRequestDetails) {
        meta.path = req.path;
        meta.method = req.method;
      }

      if (this.config.includeIp) {
        meta.ip = this.extractIp(req);
      }

      if (this.config.includeUserAgent) {
        meta.userAgent = req.headers['user-agent'];
      }

      // Custom headers
      if (this.config.customHeaders) {
        this.config.customHeaders.forEach((header) => {
          const value = req.headers[header.toLowerCase()];
          if (value) {
            meta[header] = value;
          }
        });
      }

      // Set context
      this.contextService.setMeta(meta);

      next();
    } catch (error) {
      // Don't block request if context initialization fails
      this.logger.error('Context initialization failed:', error);
      next();
    }
  }

  private extractCorrelationId(req: Request): string {
    // Use client-provided correlation ID if exists
    const clientCorrelationId = req.headers[
      this.config.headerNames.correlationId || 'x-correlation-id'
    ] as string;

    return clientCorrelationId || uuidv4();
  }

  private extractIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}
