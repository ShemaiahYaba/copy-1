// src/modules/notification/__tests__/notification.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../notification.service';
import { NotificationConfigDto, NotificationAdapter } from '../dto';
import { NotificationType } from '../interfaces';

describe('NotificationService', () => {
  let service: NotificationService;
  let config: NotificationConfigDto;

  beforeEach(async () => {
    config = new NotificationConfigDto();
    config.adapter = NotificationAdapter.WEBSOCKET;
    config.persist = false;
    config.enableLogging = false; // Disable logs in tests

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: config,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    // Clear subscribers after each test
    const callbacks = [];
    service.subscribe(() => {}); // Get count
    for (let i = 0; i < service.getSubscriberCount(); i++) {
      callbacks.push(() => {});
    }
    callbacks.forEach((cb) => service.unsubscribe(cb));
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with empty subscribers', () => {
      expect(service.getSubscriberCount()).toBe(0);
    });
  });

  describe('push() Method', () => {
    it('should create notification with auto-generated ID', async () => {
      const dto = {
        type: NotificationType.SUCCESS,
        message: 'Test notification',
      };

      const result = await service.push(dto);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should set timestamp to current time', async () => {
      const before = new Date();
      const dto = {
        type: NotificationType.INFO,
        message: 'Test message',
      };

      const result = await service.push(dto);
      const after = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate input DTO properties', async () => {
      const dto = {
        type: NotificationType.ERROR,
        message: 'Error occurred',
        context: { errorCode: 500 },
      };

      const result = await service.push(dto);

      expect(result.type).toBe(dto.type);
      expect(result.message).toBe(dto.message);
      expect(result.context).toEqual(dto.context);
    });

    it('should call all subscribers with notification', async () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();

      service.subscribe(subscriber1);
      service.subscribe(subscriber2);

      const dto = {
        type: NotificationType.SUCCESS,
        message: 'Test',
      };

      const result = await service.push(dto);

      expect(subscriber1).toHaveBeenCalledWith(result);
      expect(subscriber2).toHaveBeenCalledWith(result);
    });

    it('should handle subscriber errors without crashing', async () => {
      const errorSubscriber = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalSubscriber = jest.fn();

      service.subscribe(errorSubscriber);
      service.subscribe(normalSubscriber);

      const dto = {
        type: NotificationType.INFO,
        message: 'Test',
      };

      await expect(service.push(dto)).resolves.toBeDefined();
      expect(normalSubscriber).toHaveBeenCalled();
    });

    it('should return created notification', async () => {
      const dto = {
        type: NotificationType.UPDATE,
        message: 'Update available',
        context: { version: '2.0.0' },
      };

      const result = await service.push(dto);

      expect(result).toMatchObject({
        type: dto.type,
        message: dto.message,
        context: dto.context,
      });
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('broadcast() Method', () => {
    it('should create notification with room context', async () => {
      const room = 'test-room';
      const dto = {
        type: NotificationType.INFO,
        message: 'Room notification',
      };

      const result = await service.broadcast(room, dto);

      expect(result.context).toBeDefined();
      expect(result.context?.room).toBe(room);
    });

    it('should call subscribers with room information', async () => {
      const subscriber = jest.fn();
      service.subscribe(subscriber);

      await service.broadcast('admin-room', {
        type: NotificationType.SUCCESS,
        message: 'Test',
      });

      expect(subscriber).toHaveBeenCalled();
      const notification = subscriber.mock.calls[0][0];
      expect(notification.context.room).toBe('admin-room');
    });

    it('should merge existing context with room', async () => {
      const dto = {
        type: NotificationType.INFO,
        message: 'Test',
        context: { userId: '123' },
      };

      const result = await service.broadcast('room1', dto);

      expect(result.context).toEqual({
        userId: '123',
        room: 'room1',
      });
    });
  });

  describe('subscribe() Method', () => {
    it('should add callback to subscribers list', () => {
      const callback = jest.fn();
      const initialCount = service.getSubscriberCount();

      service.subscribe(callback);

      expect(service.getSubscriberCount()).toBe(initialCount + 1);
    });

    it('should call new subscriber on next push()', async () => {
      const callback = jest.fn();
      service.subscribe(callback);

      await service.push({
        type: NotificationType.SUCCESS,
        message: 'Test',
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      service.subscribe(callback1);
      service.subscribe(callback2);
      service.subscribe(callback3);

      expect(service.getSubscriberCount()).toBe(3);
    });
  });

  describe('unsubscribe() Method', () => {
    it('should remove callback from subscribers', () => {
      const callback = jest.fn();
      service.subscribe(callback);
      const countBefore = service.getSubscriberCount();

      service.unsubscribe(callback);

      expect(service.getSubscriberCount()).toBe(countBefore - 1);
    });

    it('should not call unsubscribed callback', async () => {
      const callback = jest.fn();
      service.subscribe(callback);
      service.unsubscribe(callback);

      await service.push({
        type: NotificationType.INFO,
        message: 'Test',
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Persistence', () => {
    beforeEach(async () => {
      config.persist = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationService,
          {
            provide: 'NOTIFICATION_CONFIG',
            useValue: config,
          },
        ],
      }).compile();

      service = module.get<NotificationService>(NotificationService);
    });

    it('should save to history when persist is true', async () => {
      const dto = {
        type: NotificationType.SUCCESS,
        message: 'Test',
      };

      await service.push(dto);
      const history = await service.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].message).toBe(dto.message);
    });

    it('should not save when persist is false', async () => {
      config.persist = false;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationService,
          {
            provide: 'NOTIFICATION_CONFIG',
            useValue: config,
          },
        ],
      }).compile();

      service = module.get<NotificationService>(NotificationService);

      await service.push({
        type: NotificationType.INFO,
        message: 'Test',
      });

      const history = await service.getHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('getHistory() Method', () => {
    beforeEach(async () => {
      config.persist = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationService,
          {
            provide: 'NOTIFICATION_CONFIG',
            useValue: config,
          },
        ],
      }).compile();

      service = module.get<NotificationService>(NotificationService);
    });

    it('should return all notifications without filters', async () => {
      await service.push({
        type: NotificationType.SUCCESS,
        message: 'Notification 1',
      });
      await service.push({
        type: NotificationType.ERROR,
        message: 'Notification 2',
      });

      const history = await service.getHistory();

      expect(history.length).toBe(2);
    });

    it('should filter by type', async () => {
      await service.push({
        type: NotificationType.SUCCESS,
        message: 'Success',
      });
      await service.push({
        type: NotificationType.ERROR,
        message: 'Error',
      });

      const history = await service.getHistory({
        type: NotificationType.SUCCESS,
      });

      expect(history.length).toBe(1);
      expect(history[0].type).toBe(NotificationType.SUCCESS);
    });

    it('should apply limit', async () => {
      for (let i = 0; i < 5; i++) {
        await service.push({
          type: NotificationType.INFO,
          message: `Notification ${i}`,
        });
      }

      const history = await service.getHistory({ limit: 3 });

      expect(history.length).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle subscriber callback errors gracefully', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      service.subscribe(errorCallback);
      service.subscribe(normalCallback);

      await expect(
        service.push({
          type: NotificationType.INFO,
          message: 'Test',
        }),
      ).resolves.toBeDefined();

      expect(normalCallback).toHaveBeenCalled();
    });
  });
});
