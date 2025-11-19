// ----------------------------------------------------------------------------
// 6. CONTEXT SERVICE - context.service.ts
// ----------------------------------------------------------------------------
import { Injectable, Inject, Logger } from '@nestjs/common';
import * as contextStorageInterface from './interfaces/context-storage.interface';
import { ContextMeta } from './interfaces/context-meta.interface';
import { ContextConfigDto } from './dto/context-config.dto';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(
    @Inject('CONTEXT_STORAGE')
    private readonly storage: contextStorageInterface.IContextStorage,
    @Inject('CONTEXT_CONFIG')
    private readonly config: ContextConfigDto,
  ) {}

  /**
   * Set complete context metadata
   * @param meta - Context metadata
   */
  setMeta(meta: ContextMeta): void {
    try {
      this.storage.set(meta);
    } catch (error) {
      this.logger.error('Failed to set context metadata', error);
    }
  }

  /**
   * Get complete context metadata
   * @returns Current context or undefined
   */
  getMeta(): ContextMeta | undefined {
    try {
      return this.storage.get();
    } catch (error) {
      this.logger.error('Failed to get context metadata', error);
      return undefined;
    }
  }

  /**
   * Update specific fields in context
   * @param partial - Fields to update
   */
  updateMeta(partial: Partial<ContextMeta>): void {
    try {
      this.storage.update(partial);
    } catch (error) {
      this.logger.error('Failed to update context metadata', error);
    }
  }

  /**
   * Get specific field from context
   * @param key - Field name
   * @returns Field value or undefined
   */
  get<T = any>(key: keyof ContextMeta): T | undefined {
    try {
      const meta = this.getMeta();
      return meta?.[key] as T;
    } catch (error) {
      this.logger.error(`Failed to get context field: ${String(key)}`, error);
      return undefined;
    }
  }

  /**
   * Set specific field in context
   * @param key - Field name
   * @param value - Field value
   */
  set(key: keyof ContextMeta, value: any): void {
    try {
      this.updateMeta({ [key]: value });
    } catch (error) {
      this.logger.error(`Failed to set context field: ${String(key)}`, error);
    }
  }

  /**
   * Get user ID from context
   * @returns User ID or undefined
   */
  getUserId(): string | undefined {
    return this.get<string>('userId');
  }

  /**
   * Get organization ID from context
   * @returns Org ID or undefined
   */
  getOrgId(): string | undefined {
    return this.get<string>('orgId');
  }

  /**
   * Get correlation ID from context (always exists)
   * @returns Correlation ID
   */
  getCorrelationId(): string {
    return this.get<string>('correlationId') || 'no-correlation-id';
  }

  /**
   * Check if context exists
   * @returns true if context is set
   */
  hasContext(): boolean {
    try {
      return this.storage.has();
    } catch (error) {
      this.logger.error('Failed to check context existence', error);
      return false;
    }
  }

  /**
   * Clear current context
   */
  clear(): void {
    try {
      this.storage.clear();
    } catch (error) {
      this.logger.error('Failed to clear context', error);
    }
  }

  /**
   * Get formatted context for logging
   * @returns Logging-friendly context object
   */
  getLoggingContext(): Record<string, any> {
    const meta = this.getMeta();
    if (!meta) {
      return {};
    }

    return {
      userId: meta.userId,
      orgId: meta.orgId,
      correlationId: meta.correlationId,
      path: meta.path,
      method: meta.method,
      timestamp: meta.timestamp,
    };
  }
}
