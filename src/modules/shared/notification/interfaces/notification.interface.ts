// src/modules/notification/interfaces/notification.interface.ts

export enum NotificationType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  INFO = 'INFO',
  UPDATE = 'UPDATE',
}

export interface INotification {
  id: string;
  type: NotificationType;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}
