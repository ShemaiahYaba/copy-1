import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class ContextService {
  private meta: Record<string, any> = {};

  setMeta(data: Record<string, any>) {
    this.meta = data;
  }

  getMeta() {
    return this.meta;
  }
}
