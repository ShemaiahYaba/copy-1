// context/decorators/context.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ContextMeta } from '../interfaces/context-meta.interface';

export const Ctx = createParamDecorator(
  (data: keyof ContextMeta | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const contextService = request.app.get('ContextService');
    const meta = contextService?.getMeta();

    return data ? meta?.[data] : meta;
  },
);
