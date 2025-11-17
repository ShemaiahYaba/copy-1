import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ContextService } from './context.service';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private contextService: ContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.contextService.setMeta({
      userId: req.headers['x-user-id'] || 'anonymous',
      correlationId: Date.now().toString(),
    });
    next();
  }
}
