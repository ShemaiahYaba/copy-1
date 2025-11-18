// src/modules/notification/notification.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';
import {
  INotification,
  NotificationType,
} from './interfaces/notification.interface';

@WebSocketGateway({
  namespace: '/notify',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private activeConnections = 0;
  private readonly isTestMode = process.env.NODE_ENV === 'test';
  private readonly testTimeout = parseInt(
    process.env.TEST_SOCKET_TIMEOUT || '5000',
    10,
  );

  constructor(private readonly notificationService: NotificationService) {}

  /** Gateway initialization */
  afterInit(server: Server): void {
    this.logger.log(
      `WebSocket Gateway initialized on /notify namespace` +
        `${this.isTestMode ? ' [TEST MODE]' : ''}`,
    );

    if (this.isTestMode) {
      this.logger.debug(
        `Test mode enabled with socket timeout: ${this.testTimeout}ms`,
      );
    }

    // Subscribe to notification service with error handling
    try {
      this.notificationService.subscribe((notification: INotification) => {
        try {
          // Normalize timestamp to ensure it's a valid Date object
          if (notification.timestamp) {
            notification.timestamp = new Date(notification.timestamp);
          }

          if (!this.isValidNotification(notification)) {
            this.logger.warn('Attempted to send invalid notification', {
              id: notification?.id,
              error: 'Invalid notification format',
            });
            return;
          }
          this.emitNotification(notification);
        } catch (error) {
          this.logger.error(`Error processing notification: ${error.message}`, {
            stack: error.stack,
            notificationId: notification?.id,
          });
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize notification service subscription: ${error.message}`,
        error.stack,
      );
    }
  }

  /** Client connection handler */
  handleConnection(client: Socket): void {
    this.activeConnections++;
    this.logger.log(
      `Client connected: ${client.id} (Total: ${this.activeConnections})`,
    );

    // Send welcome notification
    const welcomeNotification: INotification = {
      id: `welcome-${client.id}`,
      type: NotificationType.INFO,
      message: 'Connected to notification service',
      context: { clientId: client.id },
      timestamp: new Date(),
    };
    client.emit('notification', welcomeNotification);

    // Listen for room join/leave events
    client.on('join-room', (room: string) => this.handleJoinRoom(client, room));
    client.on('leave-room', (room: string) =>
      this.handleLeaveRoom(client, room),
    );
  }

  /** Client disconnect handler */
  handleDisconnect(client: Socket): void {
    this.activeConnections--;
    this.logger.log(
      `Client disconnected: ${client.id} (Total: ${this.activeConnections})`,
    );
  }

  /**
   * Validates a notification object
   * @param notification The notification to validate
   * @returns boolean indicating if the notification is valid
   */
  private isValidNotification(notification: INotification): boolean {
    try {
      if (!notification) {
        this.logger.warn('Notification is null or undefined');
        return false;
      }

      const requiredFields = ['id', 'type', 'message', 'timestamp'];
      for (const field of requiredFields) {
        if (!(field in notification)) {
          this.logger.warn(
            `Missing required field in notification: ${field}`,
            notification,
          );
          return false;
        }
      }

      if (!Object.values(NotificationType).includes(notification.type)) {
        this.logger.warn(
          `Invalid notification type: ${notification.type}`,
          notification,
        );
        return false;
      }

      if (
        typeof notification.id !== 'string' ||
        notification.id.trim() === ''
      ) {
        this.logger.warn(
          'Notification ID must be a non-empty string',
          notification,
        );
        return false;
      }

      if (
        typeof notification.message !== 'string' ||
        notification.message.trim() === ''
      ) {
        this.logger.warn(
          'Notification message must be a non-empty string',
          notification,
        );
        return false;
      }

      if (
        !(notification.timestamp instanceof Date) ||
        isNaN(notification.timestamp.getTime())
      ) {
        this.logger.warn('Invalid timestamp in notification', notification);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error validating notification: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /** Emit notification to all clients or a specific room */
  private emitNotification(notification: INotification): void {
    if (!this.isValidNotification(notification)) {
      this.logger.error('Attempted to emit invalid notification', {
        id: notification?.id,
        type: notification?.type,
        error: 'Invalid notification format',
      });
      return;
    }

    try {
      const room = notification.context?.room;

      // Create a new notification object with the timestamp as a Date object
      const notificationToEmit = {
        ...notification,
        timestamp: new Date(notification.timestamp), // Ensure timestamp is a Date object
      };

      const notificationString = JSON.stringify(notificationToEmit);

      const emitResult = room
        ? this.server.to(room).emit('notification', notificationToEmit)
        : this.server.emit('notification', notificationToEmit);

      // In test mode, wait for the emit to complete with a timeout
      if (this.isTestMode) {
        let timeoutId: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Emit timeout')),
            this.testTimeout,
          );
        });

        Promise.race([timeoutPromise, Promise.resolve(emitResult)])
          .catch((error) => {
            this.logger.error(
              `Failed to emit notification within ${this.testTimeout}ms`,
              { notificationId: notification.id, error: error.message },
            );
          })
          .finally(() => {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          });
      }

      // Log the notification
      const logMessage = room
        ? `Notification ${notification.id} sent to room: ${room}`
        : `Notification ${notification.id} broadcast to all clients`;

      this.logger.debug(`${logMessage} - ${notificationString}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit notification ${notification?.id || 'unknown'}: ${error.message}`,
        error.stack,
      );
    }
  }

  /** Active connections count */
  getActiveConnections(): number {
    return this.activeConnections;
  }

  /** Client joins a room */
  private handleJoinRoom(client: Socket, room: string): void {
    try {
      if (!room || typeof room !== 'string') {
        this.emitErrorToClient(client, 'Invalid room name');
        return;
      }

      if (!client || !client.id) {
        this.logger.error('Invalid client or client ID in handleJoinRoom');
        return;
      }

      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);

      const joinNotification: INotification = {
        id: `joined-${room}-${client.id}-${Date.now()}`,
        type: NotificationType.INFO,
        message: `Joined room ${room}`,
        context: { clientId: client.id, room },
        timestamp: new Date(),
      };

      if (this.isValidNotification(joinNotification)) {
        client.emit('notification', joinNotification);
      } else {
        this.logger.error(
          'Generated invalid join notification',
          joinNotification,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in handleJoinRoom: ${error.message}`,
        error.stack,
      );
      this.emitErrorToClient(client, 'Failed to join room');
    }
  }

  /** Helper to emit error notifications to a specific client */
  private emitErrorToClient(client: Socket, message: string): void {
    try {
      if (!client || typeof client.emit !== 'function') {
        this.logger.error('Cannot emit error - invalid client');
        return;
      }

      const errorNotification: INotification = {
        id: `error-${Date.now()}`,
        type: NotificationType.ERROR,
        message,
        context: { clientId: client.id },
        timestamp: new Date(),
      };

      if (this.isValidNotification(errorNotification)) {
        client.emit('notification', errorNotification);
      } else {
        this.logger.error(
          'Generated invalid error notification',
          errorNotification,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to emit error to client: ${error.message}`,
        error.stack,
      );
    }
  }

  /** Client leaves a room */
  private handleLeaveRoom(client: Socket, room: string): void {
    try {
      if (!client || !room) {
        this.logger.error('Invalid client or room in handleLeaveRoom');
        return;
      }

      client.leave(room);
      this.logger.log(`Client ${client.id} left room: ${room}`);

      const leaveNotification: INotification = {
        id: `left-${room}-${client.id}-${Date.now()}`,
        type: NotificationType.INFO,
        message: `Left room ${room}`,
        context: { clientId: client.id, room },
        timestamp: new Date(),
      };

      if (this.isValidNotification(leaveNotification)) {
        client.emit('notification', leaveNotification);
      } else {
        this.logger.error(
          'Generated invalid leave notification',
          leaveNotification,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in handleLeaveRoom: ${error.message}`,
        error.stack,
      );
    }
  }
}
