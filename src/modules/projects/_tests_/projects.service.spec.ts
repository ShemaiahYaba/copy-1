import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { DatabaseService } from '@database/database.service';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDb: any;
  let mockContext: any;
  let mockNotification: any;

  beforeEach(async () => {
    mockDb = {
      db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      },
    };

    mockContext = {
      getUserId: jest.fn().mockReturnValue('user-123'),
    };

    mockNotification = {
      push: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ContextService, useValue: mockContext },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a project', async () => {
    const mockClient = { id: 'client-123', userId: 'user-123' };
    const mockProject = {
      id: 'project-123',
      title: 'Test Project',
      status: 'draft',
    };

    mockDb.db.returning
      .mockResolvedValueOnce([mockClient])
      .mockResolvedValueOnce([mockProject]);

    const result = await service.create({
      title: 'Test Project',
      description: 'Test description',
      requiredSkills: ['JavaScript'],
      duration: 12,
      category: 'web_development',
    });

    expect(result).toEqual(mockProject);
    expect(mockNotification.push).toHaveBeenCalled();
  });

  // Add more tests...
});
