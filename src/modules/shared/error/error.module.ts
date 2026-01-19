import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ErrorConfigDto } from './dto/error-config.dto';
import { ErrorService } from './error.service';
import { AppErrorFilter } from './filters/app-error/app-error.filter';

@Global()
@Module({})
export class ErrorModule {
  static register(config?: ErrorConfigDto): DynamicModule {
    const errorConfig = config || new ErrorConfigDto();

    return {
      module: ErrorModule,
      imports: [],
      providers: [
        ErrorService,
        {
          provide: 'ERROR_CONFIG',
          useValue: errorConfig,
        },
        {
          provide: APP_FILTER,
          useClass: AppErrorFilter,
        },
      ],
      exports: [ErrorService],
    };
  }
}
