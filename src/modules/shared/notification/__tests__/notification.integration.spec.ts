// src/modules/shared/notification/__tests__/notification.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { NotificationModule } from '../notification.module';
import { NotificationService } from '../notification.service';
import { NotificationAdapter } from '../dto';
import { NotificationType, INotification } from '../interfaces';

describe('NotificationModule Integration Tests', () => {
  let app: INestApplication;
  let service: NotificationService;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll(async () => {
    // Find available port
    serverPort = 3001;

    // Create testing module with notification module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        NotificationModule.register({
          adapter: NotificationAdapter.WEBSOCKET,
          persist: true,
          enableLogging: false,
          maxRetries: 3,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(serverPort);

    service = moduleFixture.get<NotificationService>(NotificationService);
  });

  afterAll(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  beforeEach((done) => {
    // Connect client before each test
    clientSocket = io(`http://localhost:${serverPort}/notify`, {
      transports: ['websocket'],
      forceNew: true,
    });

    clientSocket.on('connect', () => {
      done();
    });

    // Handle connection errors
    clientSocket.on('connect_error', (error: any) => {
      console.error('Connection error:', error);
      done(error);
    });
  });

  afterEach((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    done();
  });

  describe('End-to-End Notification Flow', () => {
    it('should send notification from service to connected client', (done) => {
      const testNotification = {
        type: NotificationType.SUCCESS,
        message: 'Integration test notification',
        context: { testId: '123' },
      };

      // Listen for notification on client
      clientSocket.on('notification', (notification: INotification) => {
        try {
          expect(notification).toBeDefined();
          expect(notification.type).toBe(testNotification.type);
          expect(notification.message).toBe(testNotification.message);
          expect(notification.context).toEqual(testNotification.context);
          expect(notification.id).toBeDefined();
          expect(notification.timestamp).toBeDefined();
          done();
        } catch (error) {
          done(error);
        }
      });

      // Push notification from service
      setTimeout(() => {
        service.push(testNotification);
      }, 100);
    });

    it('should match INotification interface format', (done) => {
      clientSocket.on('notification', (notification: INotification) => {
        try {
          expect(notification).toHaveProperty('id');
          expect(notification).toHaveProperty('type');
          expect(notification).toHaveProperty('message');
          expect(notification).toHaveProperty('timestamp');
          expect(typeof notification.id).toBe('string');
          expect(Object.values(NotificationType)).toContain(notification.type);
          expect(typeof notification.message).toBe('string');

          const timestampValue = notification.timestamp;
          const timestampAsDate =
            timestampValue instanceof Date
              ? timestampValue
              : new Date(timestampValue as string);

          expect(timestampAsDate).toBeInstanceOf(Date);
          expect(isNaN(timestampAsDate.getTime())).toBe(false);
          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.INFO,
          message: 'Format test',
        });
      }, 100);
    });

    it('should have accurate timestamp (within 1 second)', (done) => {
      const beforePush = new Date();

      clientSocket.on('notification', (notification: INotification) => {
        try {
          const afterReceive = new Date();
          // Convert timestamp to Date if it's a string (happens during socket serialization)
          const notificationTime =
            typeof notification.timestamp === 'string'
              ? new Date(notification.timestamp)
              : notification.timestamp;

          expect(notificationTime).toBeInstanceOf(Date);
          expect(notificationTime.getTime()).toBeGreaterThanOrEqual(
            beforePush.getTime(),
          );
          expect(notificationTime.getTime()).toBeLessThanOrEqual(
            afterReceive.getTime(),
          );

          // Check within 1 second
          const timeDiff = afterReceive.getTime() - notificationTime.getTime();
          expect(timeDiff).toBeLessThan(1000);

          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.UPDATE,
          message: 'Timestamp test',
        });
      }, 100);
    });

    it('should preserve context data', (done) => {
      const complexContext = {
        userId: 'user-456',
        action: 'create',
        resource: 'project',
        metadata: {
          projectName: 'Test Project',
          timestamp: new Date().toISOString(),
          tags: ['urgent', 'backend'],
        },
        numbers: [1, 2, 3, 4, 5],
      };

      clientSocket.on('notification', (notification: INotification) => {
        try {
          expect(notification.context).toEqual(complexContext);
          expect(notification.context?.metadata).toEqual(
            complexContext.metadata,
          );
          expect(notification.context?.numbers).toEqual(complexContext.numbers);
          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.SUCCESS,
          message: 'Context preservation test',
          context: complexContext,
        });
      }, 100);
    });
  });

  describe('Multiple Clients', () => {
    let client2: ClientSocket;

    afterEach((done) => {
      const disconnectPromises = [];

      if (client2 && client2.connected) {
        disconnectPromises.push(
          new Promise((resolve) => {
            client2.disconnect();
            resolve(true);
          }),
        );
      }

      Promise.all(disconnectPromises).then(() => done());
    });

    it('should broadcast to all connected clients', (done) => {
      let client1Received = false;
      let client2Received = false;

      const checkBothReceived = () => {
        if (client1Received && client2Received) {
          done();
        }
      };

      // Connect second client
      client2 = io(`http://localhost:${serverPort}/notify`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client2.on('connect', () => {
        // Set up listeners
        clientSocket.on('notification', (notification: INotification) => {
          if (notification.message === 'Broadcast test') {
            client1Received = true;
            checkBothReceived();
          }
        });

        client2.on('notification', (notification: INotification) => {
          if (notification.message === 'Broadcast test') {
            client2Received = true;
            checkBothReceived();
          }
        });

        // Push notification after both clients are listening
        setTimeout(() => {
          service.push({
            type: NotificationType.INFO,
            message: 'Broadcast test',
          });
        }, 200);
      });
    }, 10000);

    it('should not send old notifications to new clients', (done) => {
      const oldNotificationMessage = 'Old notification';
      const newNotificationMessage = 'New notification';

      // Push notification before second client connects
      service.push({
        type: NotificationType.INFO,
        message: oldNotificationMessage,
      });

      setTimeout(() => {
        // Connect second client after first notification
        client2 = io(`http://localhost:${serverPort}/notify`, {
          transports: ['websocket'],
          forceNew: true,
        });

        const receivedMessages: string[] = [];

        client2.on('notification', (notification: INotification) => {
          receivedMessages.push(notification.message);

          if (notification.message === newNotificationMessage) {
            // Verify old notification was not received
            expect(receivedMessages).not.toContain(oldNotificationMessage);
            expect(receivedMessages).toContain(newNotificationMessage);
            done();
          }
        });

        client2.on('connect', () => {
          // Push new notification after second client connects
          setTimeout(() => {
            service.push({
              type: NotificationType.SUCCESS,
              message: newNotificationMessage,
            });
          }, 200);
        });
      }, 500);
    }, 10000);

    it('should not send to disconnected clients', (done) => {
      let client1Count = 0;
      let client2Count = 0;

      client2 = io(`http://localhost:${serverPort}/notify`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client2.on('connect', () => {
        clientSocket.on('notification', (notification: INotification) => {
          if (notification.message === 'Test message') {
            client1Count++;
          }
        });

        client2.on('notification', (notification: INotification) => {
          if (notification.message === 'Test message') {
            client2Count++;
          }
        });

        // Disconnect client2 after setup
        setTimeout(() => {
          client2.disconnect();

          // Wait for disconnect to process
          setTimeout(() => {
            // Send notification - should only reach client1
            service.push({
              type: NotificationType.INFO,
              message: 'Test message',
            });

            // Verify counts after notification
            setTimeout(() => {
              expect(client1Count).toBe(1);
              expect(client2Count).toBe(0);
              done();
            }, 300);
          }, 200);
        }, 200);
      });
    }, 10000);
  });

  describe('Configuration Impact', () => {
    it('should persist notifications when enabled', async () => {
      await service.push({
        type: NotificationType.SUCCESS,
        message: 'Persisted notification',
      });

      const history = await service.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history.some((n) => n.message === 'Persisted notification')).toBe(
        true,
      );
    });

    it('should retrieve persisted notifications', async () => {
      const testMessage = 'Retrieval test notification';

      await service.push({
        type: NotificationType.INFO,
        message: testMessage,
        context: { test: true },
      });

      const history = await service.getHistory();
      const found = history.find((n) => n.message === testMessage);

      expect(found).toBeDefined();
      expect(found?.type).toBe(NotificationType.INFO);
      expect(found?.context).toEqual({ test: true });
    });

    it('should filter history by type', async () => {
      // Push different types
      await service.push({
        type: NotificationType.SUCCESS,
        message: 'Success 1',
      });
      await service.push({
        type: NotificationType.ERROR,
        message: 'Error 1',
      });
      await service.push({
        type: NotificationType.SUCCESS,
        message: 'Success 2',
      });

      const successHistory = await service.getHistory({
        type: NotificationType.SUCCESS,
      });

      expect(
        successHistory.every((n) => n.type === NotificationType.SUCCESS),
      ).toBe(true);
      expect(successHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply limit to history', async () => {
      // Push multiple notifications
      for (let i = 0; i < 5; i++) {
        await service.push({
          type: NotificationType.INFO,
          message: `Test ${i}`,
        });
      }

      const limitedHistory = await service.getHistory({ limit: 3 });

      expect(limitedHistory.length).toBe(3);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle service errors gracefully', async () => {
      const invalidNotification = {
        type: 'INVALID_TYPE' as any,
        message: 'This should fail validation',
      };

      const notificationPromise = new Promise<void>((resolve, reject) => {
        const handler = () =>
          reject(new Error('Should not receive invalid notification'));
        clientSocket.once('notification', handler);
        setTimeout(() => {
          clientSocket.off('notification', handler);
          resolve();
        }, 300);
      });

      await expect(service.push(invalidNotification)).rejects.toThrow();
      await notificationPromise;
    });

    it('should continue working after error', async () => {
      const validNotificationPromise = new Promise<void>((resolve, reject) => {
        const handler = (notification: INotification) => {
          if (notification.message === 'Valid notification') {
            clientSocket.off('notification', handler);
            resolve();
          }
        };
        clientSocket.on('notification', handler);
        setTimeout(
          () => reject(new Error('Did not receive valid notification')),
          2000,
        );
      });

      await expect(
        service.push({
          type: 'INVALID' as any,
          message: 'Invalid',
        }),
      ).rejects.toThrow();

      setTimeout(() => {
        service.push({
          type: NotificationType.SUCCESS,
          message: 'Valid notification',
        });
      }, 200);

      await validNotificationPromise;
    });

    it('should handle rapid notifications without loss', (done) => {
      const messageCount = 10;
      const receivedMessages: string[] = [];

      clientSocket.on('notification', (notification: INotification) => {
        if (notification.message.startsWith('Rapid test')) {
          receivedMessages.push(notification.message);

          if (receivedMessages.length === messageCount) {
            // Verify all messages received
            expect(receivedMessages.length).toBe(messageCount);
            done();
          }
        }
      });

      // Send rapid notifications
      setTimeout(() => {
        for (let i = 0; i < messageCount; i++) {
          service.push({
            type: NotificationType.INFO,
            message: `Rapid test ${i}`,
          });
        }
      }, 200);
    }, 10000);
  });

  describe('Notification Types', () => {
    it('should handle SUCCESS notifications', (done) => {
      clientSocket.on('notification', (notification: INotification) => {
        if (notification.type === NotificationType.SUCCESS) {
          expect(notification.type).toBe(NotificationType.SUCCESS);
          expect(notification.message).toBe('Success message');
          done();
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.SUCCESS,
          message: 'Success message',
        });
      }, 100);
    });

    it('should handle ERROR notifications', (done) => {
      clientSocket.on('notification', (notification: INotification) => {
        if (notification.type === NotificationType.ERROR) {
          expect(notification.type).toBe(NotificationType.ERROR);
          expect(notification.message).toBe('Error message');
          done();
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.ERROR,
          message: 'Error message',
        });
      }, 100);
    });

    it('should handle INFO notifications', (done) => {
      clientSocket.on('notification', (notification: INotification) => {
        if (notification.type === NotificationType.INFO) {
          expect(notification.type).toBe(NotificationType.INFO);
          expect(notification.message).toBe('Info message');
          done();
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.INFO,
          message: 'Info message',
        });
      }, 100);
    });

    it('should handle UPDATE notifications', (done) => {
      clientSocket.on('notification', (notification: INotification) => {
        if (notification.type === NotificationType.UPDATE) {
          expect(notification.type).toBe(NotificationType.UPDATE);
          expect(notification.message).toBe('Update message');
          done();
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.UPDATE,
          message: 'Update message',
        });
      }, 100);
    });
  });

  describe('Room Broadcasting Integration', () => {
    jest.setTimeout(15000);
    let roomClient: ClientSocket;

    afterEach((done) => {
      if (roomClient && roomClient.connected) {
        roomClient.disconnect();
      }
      done();
    });

    it('should broadcast to specific room', (done) => {
      const room = 'test-room';

      roomClient = io(`http://localhost:${serverPort}/notify`, {
        transports: ['websocket'],
        forceNew: true,
      });

      roomClient.on('connect', () => {
        roomClient.emit('join-room', room);

        roomClient.on('notification', (notification: INotification) => {
          if (notification.message === `Joined room ${room}`) {
            return;
          }

          if (notification.context?.room === room) {
            expect(notification.context.room).toBe(room);
            expect(notification.message).toBe('Room broadcast');
            done();
          }
        });

        setTimeout(() => {
          service.broadcast(room, {
            type: NotificationType.INFO,
            message: 'Room broadcast',
          });
        }, 300);
      });
    }, 10000);
  });

  describe('Performance', () => {
    it('should handle 100 rapid notifications', (done) => {
      const count = 100;
      let received = 0;

      clientSocket.on('notification', (notification: INotification) => {
        if (notification.message.startsWith('Perf test')) {
          received++;
          if (received === count) {
            expect(received).toBe(count);
            done();
          }
        }
      });

      setTimeout(() => {
        for (let i = 0; i < count; i++) {
          service.push({
            type: NotificationType.INFO,
            message: `Perf test ${i}`,
          });
        }
      }, 200);
    }, 15000);

    it('should handle notifications with large context', (done) => {
      const largeContext = {
        data: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          value: `Value ${i}`,
          metadata: { timestamp: new Date().toISOString() },
        })),
      };

      clientSocket.on('notification', (notification: INotification) => {
        if (notification.message === 'Large context test') {
          expect(notification.context?.data.length).toBe(100);
          done();
        }
      });

      setTimeout(() => {
        service.push({
          type: NotificationType.INFO,
          message: 'Large context test',
          context: largeContext,
        });
      }, 100);
    }, 10000);
  });
});
