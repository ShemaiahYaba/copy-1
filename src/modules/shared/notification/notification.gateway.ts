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
import { INotification, NotificationType } from './interfaces/notification.interface';

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

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Called when gateway initializes
   * Subscribe to notification service
   */
  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized on /notify namespace');

    // Subscribe to notification service
    this.notificationService.subscribe((notification: INotification) => {
      this.emitNotification(notification);
    });
  }

  /**
   * Called when client connects
   * @param client - Connected socket client
   */
  handleConnection(client: Socket): void {
    this.activeConnections++;
    this.logger.log(
      `Client connected: ${client.id} (Total: ${this.activeConnections})`,
    );

    // Send welcome notification to new client
    const welcomeNotification: INotification = {
      id: `welcome-${client.id}`,
      type: NotificationType.INFO,
      message: 'Connected to notification service',
      context: {
        clientId: client.id,
      },
      timestamp: new Date(),
    };

    client.emit('notification', welcomeNotification);
  }

  /**
   * Called when client disconnects
   * @param client - Disconnected socket client
   */
  handleDisconnect(client: Socket): void {
    this.activeConnections--;
    this.logger.log(
      `Client disconnected: ${client.id} (Total: ${this.activeConnections})`,
    );
  }

  /**
   * Emit notification to all connected clients
   */
  private emitNotification(notification: INotification): void {
    try {
      // Check if notification has room context
      const room = notification.context?.room;

      if (room) {
        // Emit to specific room
        this.server.to(room).emit('notification', notification);
        this.logger.debug(
          `Notification ${notification.id} sent to room: ${room}`,
        );
      } else {
        // Emit to all clients
        this.server.emit('notification', notification);
        this.logger.debug(
          `Notification ${notification.id} broadcast to all clients`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to emit notification: ${error}`);
    }
  }

  /**
   * Get active connections count
   */
  getActiveConnections(): number {
    return this.activeConnections;
  }
}