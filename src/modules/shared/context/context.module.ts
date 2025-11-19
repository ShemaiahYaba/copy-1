// FILE: src/modules/shared/context/context.module.ts

import {
  Module,
  DynamicModule,
  Global,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { ContextService } from './context.service';
import { ContextMiddleware } from './context.middleware';
import {
  ContextConfigDto,
  ContextStorageAdapter,
} from './dto/context-config.dto';
import { ClsStorageAdapter } from './adapters/cls-storage.adapter';
import { AsyncHooksStorageAdapter } from './adapters/async-hooks.adapter';

@Global()
@Module({})
export class ContextModule implements NestModule {
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
          ? [ClsModule.forRoot({ middleware: { mount: false } })]
          : []),
      ],
      providers: [
        ContextService,
        ContextMiddleware,
        {
          provide: 'CONTEXT_CONFIG',
          useValue: finalConfig,
        },
        StorageProvider,
      ],
      exports: [ContextService],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
