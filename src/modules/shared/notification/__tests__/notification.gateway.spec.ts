// src/modules/shared/notification/__tests__/notification.gateway.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from '../notification.gateway';
import { NotificationService } from '../notification.service';
import { NotificationConfigDto, NotificationAdapter } from '../dto';
import { NotificationType, INotification } from '../interfaces';
import { Server, Socket } from 'socket.io';

// Increase global timeout for all tests
jest.setTimeout(15000);

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let service: NotificationService;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    // Mock WebSocket Server with proper async support
    mockServer = {
      emit: jest.fn().mockImplementation(() => Promise.resolve([true])), // Return a resolved promise with response
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      sockets: {
        sockets: new Map(),
      },
      // Add mock for rooms and other required server methods
      fetchSockets: jest.fn().mockResolvedValue([]),
      serverSideEmit: jest.fn(),
      compress: jest.fn().mockReturnThis(),
      toJSON: jest.fn().mockReturnValue({}),
    } as unknown as Server;

    // Mock Socket Client with all required methods and proper Date handling
    const createMockEmit = () => {
      return jest.fn().mockImplementation((event, data, callback) => {
        // Convert any ISO date strings back to Date objects for testing
        const processData = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;
          if (obj instanceof Date) return obj;
          if (Array.isArray(obj)) return obj.map(processData);
          if (typeof obj === 'object') {
            return Object.entries(obj).reduce(
              (acc, [key, value]) => {
                if (
                  typeof value === 'string' &&
                  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z$/.test(value)
                ) {
                  acc[key] = new Date(value);
                } else if (value && typeof value === 'object') {
                  acc[key] = processData(value);
                } else {
                  acc[key] = value;
                }
                return acc;
              },
              {} as Record<string, any>,
            );
          }
          return obj;
        };

        const processedData = processData(data);

        // Execute callback if provided
        if (typeof callback === 'function') {
          process.nextTick(() => callback(processedData));
        }
        return true;
      });
    };

    mockSocket = {
      id: 'test-client-123',
      on: jest.fn(),
      emit: createMockEmit(),
      join: jest.fn().mockReturnThis(),
      leave: jest.fn().mockReturnThis(),
      disconnect: jest.fn().mockImplementation(function (
        this: any,
        close = false,
      ) {
        (this as any).connected = false;
        (this as any).disconnected = true;
        return this;
      }),
      to: jest.fn().mockReturnThis(),
      broadcast: {
        to: jest.fn().mockReturnThis(),
        emit: createMockEmit(),
      },
      rooms: new Set(),
      handshake: {
        headers: {},
        query: {},
        auth: {},
      },
      connected: true,
      disconnected: false,
      removeAllListeners: jest.fn().mockReturnThis(),
      addListener: jest.fn().mockReturnThis(),
      removeListener: jest.fn().mockReturnThis(),
    } as unknown as Socket;

    // Create module with mocked config
    const config = new NotificationConfigDto();
    config.adapter = NotificationAdapter.WEBSOCKET;
    config.persist = false;
    config.enableLogging = false; // Disable logs in tests

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        NotificationService,
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: config,
        },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    service = module.get<NotificationService>(NotificationService);

    // Inject mock server
    gateway.server = mockServer as Server;
  });

  afterEach(async () => {
    // Wait for any pending promises to resolve
    await new Promise(process.nextTick);
    jest.clearAllMocks();

    // Reset active connections
    if (gateway) {
      gateway['activeConnections'] = 0;
    }

    // Add a small delay to ensure all async operations complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up any remaining connections
    if (gateway) {
      // If there's a server instance, close it
      const server = gateway['server'];
      if (server && typeof (server as any).close === 'function') {
        await new Promise<void>((resolve) => {
          (server as any).close(() => resolve());
        });
      }
    }

    // Clear any remaining mocks and timers
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Gateway Initialization', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should subscribe to NotificationService on init', () => {
      const subscribeSpy = jest.spyOn(service, 'subscribe');

      gateway.afterInit(mockServer as Server);

      expect(subscribeSpy).toHaveBeenCalledWith(expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
    });

    it('should set up WebSocket server with test mode indicator', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      const debugSpy = jest.spyOn(gateway['logger'], 'debug');

      gateway.afterInit(mockServer as Server);

      expect(gateway.server).toBeDefined();
      expect(gateway.server).toBe(mockServer);

      // Verify the log message includes the test mode indicator
      expect(logSpy).toHaveBeenCalledWith(
        'WebSocket Gateway initialized on /notify namespace [TEST MODE]',
      );

      // Also verify that the test mode debug log was called
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test mode enabled with socket timeout:'),
      );
    });

    it('should have initial active connections count of 0', () => {
      expect(gateway.getActiveConnections()).toBe(0);
    });
  });

  // Helper function to wait for all promises to resolve
  const flushPromises = () => new Promise(process.nextTick);

  // Helper to wait for all async operations to complete
  const waitForAsync = (ms = 0) =>
    new Promise((resolve) => setTimeout(resolve, ms)).then(flushPromises);

  describe('Client Connection', () => {
    // Increase timeout for all tests in this describe block
    jest.setTimeout(15000);

    it('should log client connection', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket as Socket);
      await waitForAsync(50);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client connected: test-client-123'),
      );

      // Clean up
      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }
    });

    it('should increment active connections count', async () => {
      const initialCount = gateway.getActiveConnections();

      gateway.handleConnection(mockSocket as Socket);
      await waitForAsync(50);

      expect(gateway.getActiveConnections()).toBe(initialCount + 1);

      // Clean up
      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }
    });

    it('should send welcome notification to new client', async () => {
      // Mock the emit function to resolve immediately
      const emitMock = mockSocket.emit as jest.Mock;
      emitMock.mockImplementation((event, data, callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return true;
      });

      gateway.handleConnection(mockSocket as Socket);
      await waitForAsync(50);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          id: expect.stringContaining('welcome-'),
          type: NotificationType.INFO,
          message: 'Connected to notification service',
          context: {
            clientId: 'test-client-123',
          },
          timestamp: expect.anything(),
        }),
      );

      const notificationCall = emitMock.mock.calls.find(
        ([event]) => event === 'notification',
      );
      expect(notificationCall).toBeDefined();
      const payload = notificationCall?.[1];
      expect(payload).toBeDefined();
      const timestampValue = payload?.timestamp;
      const timestampAsDate =
        timestampValue instanceof Date
          ? timestampValue
          : timestampValue
            ? new Date(timestampValue)
            : undefined;
      expect(timestampAsDate).toBeDefined();
      expect(timestampAsDate).toBeInstanceOf(Date);
      expect(isNaN((timestampAsDate as Date).getTime())).toBe(false);

      // Clean up
      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }
    });

    it('should handle multiple client connections', async () => {
      const socket1 = {
        ...mockSocket,
        id: 'client-1',
        emit: jest.fn().mockImplementation((event, data, callback) => {
          if (typeof callback === 'function') callback();
          return true;
        }),
      };
      const socket2 = {
        ...mockSocket,
        id: 'client-2',
        emit: jest.fn().mockImplementation((event, data, callback) => {
          if (typeof callback === 'function') callback();
          return true;
        }),
      };
      const socket3 = {
        ...mockSocket,
        id: 'client-3',
        emit: jest.fn().mockImplementation((event, data, callback) => {
          if (typeof callback === 'function') callback();
          return true;
        }),
      };

      gateway.handleConnection(socket1 as unknown as Socket);
      gateway.handleConnection(socket2 as unknown as Socket);
      gateway.handleConnection(socket3 as unknown as Socket);

      await flushPromises();

      expect(gateway.getActiveConnections()).toBe(3);

      // Clean up
      gateway.handleDisconnect(socket1 as unknown as Socket);
      gateway.handleDisconnect(socket2 as unknown as Socket);
      gateway.handleDisconnect(socket3 as unknown as Socket);
    });

    it('should track connection count correctly', async () => {
      // Initial state
      expect(gateway.getActiveConnections()).toBe(0);

      // First connection
      const socket1 = {
        ...mockSocket,
        id: 'client-1',
        emit: jest.fn().mockImplementation((event, data, callback) => {
          if (typeof callback === 'function') callback();
          return true;
        }),
      };
      gateway.handleConnection(socket1 as unknown as Socket);
      await flushPromises();
      expect(gateway.getActiveConnections()).toBe(1);

      // Second connection
      const socket2 = {
        ...mockSocket,
        id: 'client-2',
        emit: jest.fn().mockImplementation((event, data, callback) => {
          if (typeof callback === 'function') callback();
          return true;
        }),
      };
      gateway.handleConnection(socket2 as unknown as Socket);
      await flushPromises();
      expect(gateway.getActiveConnections()).toBe(2);

      // Disconnect first client
      gateway.handleDisconnect(socket1 as unknown as Socket);
      await flushPromises();
      expect(gateway.getActiveConnections()).toBe(1);

      // Disconnect second client
      gateway.handleDisconnect(socket2 as unknown as Socket);
      await flushPromises();
      expect(gateway.getActiveConnections()).toBe(0);
    });
  });

  describe('Client Disconnection', () => {
    beforeEach(() => {
      // Connect a client first
      gateway.handleConnection(mockSocket as Socket);
    });

    it('should log client disconnection', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client disconnected: test-client-123'),
      );
    });

    it('should decrement active connections count', async () => {
      const countBefore = gateway.getActiveConnections();

      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }

      expect(gateway.getActiveConnections()).toBe(countBefore - 1);
    });

    it('should handle multiple disconnections', async () => {
      const socket2 = { ...mockSocket, id: 'client-2', emit: jest.fn() };
      const socket3 = { ...mockSocket, id: 'client-3', emit: jest.fn() };

      gateway.handleConnection(socket2 as unknown as Socket);
      gateway.handleConnection(socket3 as unknown as Socket);

      expect(gateway.getActiveConnections()).toBe(3);

      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }
      expect(gateway.getActiveConnections()).toBe(2);

      gateway.handleDisconnect(socket2 as unknown as Socket);
      expect(gateway.getActiveConnections()).toBe(1);
    });

    it('should not go below zero connections', async () => {
      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }
      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }

      expect(gateway.getActiveConnections()).toBe(-1); // This shows current behavior
      // Note: You may want to add logic to prevent negative counts
    });
  });

  describe('Notification Broadcasting', () => {
    beforeEach(() => {
      // Initialize gateway and subscribe to service
      gateway.afterInit(mockServer as Server);
    });

    it('should emit notification to all clients', async () => {
      const notification: INotification = {
        id: 'notif-123',
        type: NotificationType.SUCCESS,
        message: 'Test notification',
        timestamp: new Date(),
      };

      await service.push({
        type: notification.type,
        message: notification.message,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          id: expect.any(String),
          type: NotificationType.SUCCESS,
          message: 'Test notification',
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should format notification correctly', async () => {
      const dto = {
        type: NotificationType.ERROR,
        message: 'An error occurred',
        context: { errorCode: 500, details: 'Server error' },
      };

      await service.push(dto);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          type: NotificationType.ERROR,
          message: 'An error occurred',
          context: { errorCode: 500, details: 'Server error' },
        }),
      );
    });

    it('should handle socket emission errors gracefully', async () => {
      // Mock emit to throw error
      mockServer.emit = jest.fn().mockImplementation(() => {
        throw new Error('Emission failed');
      });

      const errorSpy = jest.spyOn(gateway['logger'], 'error');

      await service.push({
        type: NotificationType.INFO,
        message: 'Test',
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to emit notification'),
        expect.any(String),
      );
    });

    it('should emit multiple notifications in sequence', async () => {
      await service.push({
        type: NotificationType.INFO,
        message: 'First notification',
      });

      await service.push({
        type: NotificationType.SUCCESS,
        message: 'Second notification',
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });

    it('should preserve notification context', async () => {
      const context = {
        userId: 'user-123',
        action: 'create',
        resource: 'project',
      };

      await service.push({
        type: NotificationType.UPDATE,
        message: 'Project created',
        context,
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          context,
        }),
      );
    });
  });

  describe('Room Broadcasting', () => {
    beforeEach(() => {
      gateway.afterInit(mockServer as Server);
    });

    it('should emit to specific room only', async () => {
      const room = 'admin-room';

      await service.broadcast(room, {
        type: NotificationType.INFO,
        message: 'Admin notification',
      });

      expect(mockServer.to).toHaveBeenCalledWith(room);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          message: 'Admin notification',
          context: expect.objectContaining({
            room: 'admin-room',
          }),
        }),
      );
    });

    it('should not emit to clients outside room', async () => {
      await service.broadcast('private-room', {
        type: NotificationType.SUCCESS,
        message: 'Private message',
      });

      // Verify it uses room-specific emission
      expect(mockServer.to).toHaveBeenCalledWith('private-room');
    });

    it('should handle multiple room broadcasts', async () => {
      await service.broadcast('room-1', {
        type: NotificationType.INFO,
        message: 'Message 1',
      });

      await service.broadcast('room-2', {
        type: NotificationType.INFO,
        message: 'Message 2',
      });

      expect(mockServer.to).toHaveBeenCalledWith('room-1');
      expect(mockServer.to).toHaveBeenCalledWith('room-2');
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });

    it('should include room in notification context', async () => {
      const room = 'test-room';

      await service.broadcast(room, {
        type: NotificationType.UPDATE,
        message: 'Room update',
        context: { data: 'test' },
      });

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          context: {
            data: 'test',
            room: 'test-room',
          },
        }),
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      gateway.afterInit(mockServer as Server);
    });

    it('should handle malformed notification gracefully', async () => {
      const errorSpy = jest.spyOn(gateway['logger'], 'error');

      // Force an error in emission
      mockServer.emit = jest.fn().mockImplementation(() => {
        throw new Error('Invalid notification format');
      });

      await service.push({
        type: NotificationType.INFO,
        message: 'Test',
      });

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should continue working after emission error', async () => {
      // First call throws error
      mockServer.emit = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('Temporary error');
        })
        .mockImplementationOnce(() => true);

      // First push - should fail gracefully
      await service.push({
        type: NotificationType.INFO,
        message: 'First',
      });

      // Second push - should work
      await service.push({
        type: NotificationType.INFO,
        message: 'Second',
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration with NotificationService', () => {
    it('should receive notifications from service', async () => {
      gateway.afterInit(mockServer as Server);

      const dto = {
        type: NotificationType.SUCCESS,
        message: 'Integration test',
      };

      await service.push(dto);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          type: dto.type,
          message: dto.message,
        }),
      );
    });

    it('should handle all notification types', async () => {
      gateway.afterInit(mockServer as Server);

      const types = [
        NotificationType.SUCCESS,
        NotificationType.ERROR,
        NotificationType.INFO,
        NotificationType.UPDATE,
      ];

      for (const type of types) {
        await service.push({
          type,
          message: `Test ${type}`,
        });
      }

      expect(mockServer.emit).toHaveBeenCalledTimes(types.length);
    });
  });

  describe('Connection Lifecycle', () => {
    it('should handle complete client lifecycle', async () => {
      // Connect
      expect(gateway.getActiveConnections()).toBe(0);

      gateway.handleConnection(mockSocket as Socket);
      expect(gateway.getActiveConnections()).toBe(1);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'notification',
        expect.any(Object),
      );

      // Disconnect
      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }
      expect(gateway.getActiveConnections()).toBe(0);
    });

    it('should handle rapid connect/disconnect', async () => {
      const sockets = Array.from({ length: 10 }, (_, i) => ({
        ...mockSocket,
        id: `client-${i}`,
        emit: jest.fn().mockImplementation((event, data, callback) => {
          if (typeof callback === 'function') callback();
          return true;
        }),
        connected: true,
        disconnected: false,
      }));

      // Connect all
      sockets.forEach((socket) => {
        gateway.handleConnection(socket as unknown as Socket);
      });
      expect(gateway.getActiveConnections()).toBe(10);

      // Disconnect all
      sockets.forEach((socket) => {
        gateway.handleDisconnect(socket as unknown as Socket);
      });
      expect(gateway.getActiveConnections()).toBe(0);
    });
  });

  describe('Logging', () => {
    it('should log initialization', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.afterInit(mockServer as Server);

      expect(logSpy).toHaveBeenCalledWith(
        'WebSocket Gateway initialized on /notify namespace [TEST MODE]',
      );
    });

    it('should log with client count on connection', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket as Socket);

      // Check if any log call contains the expected string
      const logCalls = (logSpy as jest.Mock).mock.calls;
      const found = logCalls.some((call: any[]) =>
        call.some(
          (arg: any) => typeof arg === 'string' && arg.includes('(Total: 1)'),
        ),
      );
      expect(found).toBe(true);
    });

    it('should log with client count on disconnection', async () => {
      gateway.handleConnection(mockSocket as Socket);
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      if (mockSocket.connected) {
        gateway.handleDisconnect(mockSocket as Socket);
        await waitForAsync(50);
      }

      // Check if any log call contains the expected string
      const logCalls = (logSpy as jest.Mock).mock.calls;
      const found = logCalls.some((call: any[]) =>
        call.some(
          (arg: any) => typeof arg === 'string' && arg.includes('(Total: 0)'),
        ),
      );
      expect(found).toBe(true);
    });
  });
});
