// ----------------------------------------------------------------------------
// 5. ADAPTERS - async-hooks.adapter.ts
// ----------------------------------------------------------------------------
import { AsyncLocalStorage } from 'async_hooks';
import { IContextStorage } from '../interfaces/context-storage.interface';
import { ContextMeta } from '../interfaces/context-meta.interface';

export class AsyncHooksStorageAdapter implements IContextStorage {
  private storage = new AsyncLocalStorage<ContextMeta>();

  set(meta: ContextMeta): void {
    this.storage.enterWith(meta);
  }

  get(): ContextMeta | undefined {
    return this.storage.getStore();
  }

  has(): boolean {
    return this.storage.getStore() !== undefined;
  }

  clear(): void {
    // AsyncLocalStorage doesn't have explicit clear
    // Context will be cleared when async context exits
  }

  update(partial: Partial<ContextMeta>): void {
    const current = this.get();
    if (current) {
      this.set({ ...current, ...partial });
    }
  }

  /**
   * Run callback with context
   */
  run<T>(meta: ContextMeta, callback: () => T): T {
    return this.storage.run(meta, callback);
  }
}
