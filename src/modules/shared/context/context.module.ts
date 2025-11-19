import { Module, DynamicModule, Global } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { ContextService } from './context.service';
import { ContextMiddleware } from './context.middleware';
import {
  ContextConfigDto,
  ContextStorageAdapter,
  UserIdSource,
} from './dto/context-config.dto';
import { ClsStorageAdapter } from './adapters/cls-storage.adapter';
import { AsyncHooksStorageAdapter } from './adapters/async-hooks.adapter';
import { Request } from 'express';

@Global()
@Module({})
export class ContextModule {
  static register(config?: ContextConfigDto): DynamicModule {
    const finalConfig = config || new ContextConfigDto();

    // Choose storage adapter
    const StorageProvider = {
      provide: 'CONTEXT_STORAGE',
      useFactory: (cls?: ClsService) => {
        if (finalConfig.adapter === ContextStorageAdapter.CLS) {
          if (!cls) {
            throw new Error('ClsService not available. Install nestjs-cls.');
          }
          return new ClsStorageAdapter(cls);
        } else {
          return new AsyncHooksStorageAdapter();
        }
      },
      inject: [ClsService],
    };

    return {
      module: ContextModule,
      imports: [
        // Conditionally import ClsModule if using CLS adapter
        ...(finalConfig.adapter === ContextStorageAdapter.CLS
          ? [
              ClsModule.forRoot({
                global: true,
                middleware: {
                  mount: true,
                  generateId: true,
                  setup: (cls, req: Request) => {
                    // This runs INSIDE the CLS context
                    const meta: any = {
                      correlationId:
                        (req.headers[
                          finalConfig.headerNames.correlationId ||
                            'x-correlation-id'
                        ] as string) || uuidv4(),
                      timestamp: new Date(),
                    };

                    // Extract user information
                    if (finalConfig.userIdSource === UserIdSource.HEADER) {
                      meta.userId = req.headers[
                        finalConfig.headerNames.userId
                      ] as string;
                      meta.orgId = req.headers[
                        finalConfig.headerNames.orgId
                      ] as string;
                    } else if (finalConfig.userIdSource === UserIdSource.JWT) {
                      const user = (req as any).user;
                      if (user) {
                        meta.userId = user.id || user.userId || user.sub;
                        meta.orgId = user.orgId || user.organizationId;
                        meta.username = user.username || user.name;
                        meta.email = user.email;
                      }
                    }

                    // Add request details
                    if (finalConfig.includeRequestDetails) {
                      meta.path = req.path;
                      meta.method = req.method;
                    }

                    if (finalConfig.includeIp) {
                      meta.ip =
                        (req.headers['x-forwarded-for'] as string)
                          ?.split(',')[0]
                          ?.trim() ||
                        (req.headers['x-real-ip'] as string) ||
                        req.socket?.remoteAddress ||
                        'unknown';
                    }

                    if (finalConfig.includeUserAgent) {
                      meta.userAgent = req.headers['user-agent'];
                    }

                    // Custom headers
                    if (finalConfig.customHeaders) {
                      finalConfig.customHeaders.forEach((header) => {
                        const value = req.headers[header.toLowerCase()];
                        if (value) {
                          meta[header] = value;
                        }
                      });
                    }

                    // Set context directly in CLS
                    cls.set('context', meta);
                  },
                },
              }),
            ]
          : []),
      ],
      providers: [
        ContextService,
        {
          provide: 'CONTEXT_CONFIG',
          useValue: finalConfig,
        },
        StorageProvider,
      ],
      exports: [ContextService],
    };
  }

  // ❌ REMOVE the configure() method entirely
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(ContextMiddleware).forRoutes('*');
  // }
}
