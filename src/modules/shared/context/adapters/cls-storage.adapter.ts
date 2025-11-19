// ----------------------------------------------------------------------------
// 4. ADAPTERS - cls-storage.adapter.ts
// ----------------------------------------------------------------------------
import { ClsService } from 'nestjs-cls';
import { IContextStorage } from '../interfaces/context-storage.interface';
import { ContextMeta } from '../interfaces/context-meta.interface';

export class ClsStorageAdapter implements IContextStorage {
  constructor(private readonly cls: ClsService) {}

  set(meta: ContextMeta): void {
    this.cls.set('context', meta);
  }

  get(): ContextMeta | undefined {
    return this.cls.get('context');
  }

  has(): boolean {
    return this.cls.get('context') !== undefined;
  }

  clear(): void {
    this.cls.set('context', undefined);
  }

  update(partial: Partial<ContextMeta>): void {
    const current = this.get();
    if (current) {
      this.set({ ...current, ...partial });
    }
  }
}
