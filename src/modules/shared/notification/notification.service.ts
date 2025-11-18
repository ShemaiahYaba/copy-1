// src/modules/notification/notification.service.ts

import { Injectable, Inject, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateNotificationDto,
  NotificationConfigDto,
} from './dto';
import {
  INotification,
  NotificationType,
} from './interfaces/notification.interface';

type NotificationCallback = (notification: INotification) => void;

export interface NotificationFilters {
  type?: NotificationType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private subscribers: NotificationCallback[] = [];
  private notificationHistory: INotification[] = [];

  constructor(
    @Inject('NOTIFICATION_CONFIG')
    private readonly config: NotificationConfigDto,
  ) {}

  /**
   * Send a notification to all connected clients
   * @param dto - Notification data
   * @returns Created notification
   */
  async push(dto: CreateNotificationDto): Promise<INotification> {
    // Create notification with auto-generated fields
    const notification: INotification = {
      id: uuidv4(),
      type: dto.type,
      message: dto.message,
      context: dto.context,
      timestamp: new Date(),
    };

    // Log if enabled
    if (this.config.enableLogging) {
      this.logger.log(
        `[NOTIFICATION] [${notification.type}] ${notification.message}`,
      );
      if (notification.context) {
        this.logger.debug(`Context: ${JSON.stringify(notification.context)}`);
      }
    }

    // Persist if enabled
    if (this.config.persist) {
      await this.persistNotification(notification);
    }

    // Notify all subscribers
    this.notifySubscribers(notification);

    return notification;
  }

  /**
   * Broadcast notification to specific room/channel
   * @param room - Target room name
   * @param dto - Notification data
   */
  async broadcast(
    room: string,
    dto: CreateNotificationDto,
  ): Promise<INotification> {
    const notification = await this.push({
      ...dto,
      context: {
        ...dto.context,
        room,
      },
    });

    return notification;
  }

  /**
   * Get notification history (if persistence enabled)
   * @param filters - Query filters
   */
  async getHistory(
    filters?: NotificationFilters,
  ): Promise<INotification[]> {
    if (!this.config.persist) {
      this.logger.warn(
        'Persistence is disabled. History is not available.',
      );
      return [];
    }

    let history = [...this.notificationHistory];

    // Apply filters
    if (filters) {
      if (filters.type) {
        history = history.filter((n) => n.type === filters.type);
      }

      if (filters.startDate) {
        history = history.filter(
          (n) => n.timestamp >= filters.startDate!,
        );
      }

      if (filters.endDate) {
        history = history.filter(
          (n) => n.timestamp <= filters.endDate!,
        );
      }

      if (filters.limit) {
        history = history.slice(0, filters.limit);
      }
    }

    return history;
  }

  /**
   * Subscribe to notification events (internal use)
   * @param callback - Function to call on new notification
   */
  subscribe(callback: NotificationCallback): void {
    this.subscribers.push(callback);
  }

  /**
   * Unsubscribe from notification events
   * @param callback - Callback to remove
   */
  unsubscribe(callback: NotificationCallback): void {
    this.subscribers = this.subscribers.filter((cb) => cb !== callback);
  }

  /**
   * Private method to persist notification
   */
  private async persistNotification(
    notification: INotification,
  ): Promise<void> {
    let retries = 0;
    const maxRetries = this.config.maxRetries || 3;

    while (retries < maxRetries) {
      try {
        // Store in memory (replace with actual DB save in production)
        this.notificationHistory.push(notification);
        
        // Limit history size to prevent memory issues
        if (this.notificationHistory.length > 1000) {
          this.notificationHistory = this.notificationHistory.slice(-1000);
        }

        this.logger.debug(
          `Notification ${notification.id} persisted successfully`,
        );
        return;
      } catch (error) {
        retries++;
        this.logger.error(
          `Failed to persist notification (attempt ${retries}/${maxRetries}): ${error}`,
        );

        if (retries >= maxRetries) {
          this.logger.error(
            `Max retries reached. Notification ${notification.id} not persisted.`,
          );
        }
      }
    }
  }

  /**
   * Private method to notify all subscribers
   */
  private notifySubscribers(notification: INotification): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        this.logger.error(
          `Error in subscriber callback: ${error}`,
        );
      }
    });
  }

  /**
   * Get total number of subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.length;
  }
}