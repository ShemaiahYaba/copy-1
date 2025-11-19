// ----------------------------------------------------------------------------
// 2. INTERFACES - context-storage.interface.ts

import { ContextMeta } from './context-meta.interface';

// ----------------------------------------------------------------------------
export interface IContextStorage {
  /**
   * Set context metadata for current request
   */
  set(meta: ContextMeta): void;

  /**
   * Get context metadata for current request
   */
  get(): ContextMeta | undefined;

  /**
   * Check if context exists for current request
   */
  has(): boolean;

  /**
   * Clear context for current request
   */
  clear(): void;

  /**
   * Update specific fields in context
   */
  update(partial: Partial<ContextMeta>): void;
}
