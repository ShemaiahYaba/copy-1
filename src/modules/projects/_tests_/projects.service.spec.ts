/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
      approvalStatus: 'pending',
      isPublished: false,
      clientId: 'client-123',
      createdBy: 'user-123',
      category: 'web_development',
    };

    // Mock the client lookup query
    const selectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([mockClient]),
    };
    mockDb.db.select.mockReturnValue(selectChain);

    // Mock the insert query
    const insertChain = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockProject]),
    };
    mockDb.db.insert.mockReturnValue(insertChain);

    const result = await service.create({
      title: 'Test Project',
      description: 'Test description',
      requiredSkills: ['JavaScript'],
      duration: 12,
      category: 'web_development',
    });

    expect(result).toEqual(mockProject);
    expect(mockNotification.push).toHaveBeenCalledWith({
      type: expect.any(String),
      message: expect.stringContaining('created successfully'),
      context: { projectId: 'project-123' },
    });
    expect(mockDb.db.select).toHaveBeenCalled();
    expect(mockDb.db.insert).toHaveBeenCalled();
  });

  it('should throw error when user is not authenticated', async () => {
    mockContext.getUserId.mockReturnValue(null);

    await expect(
      service.create({
        title: 'Test Project',
        description: 'Test description',
        requiredSkills: ['JavaScript'],
        duration: 12,
        category: 'web_development',
      }),
    ).rejects.toThrow('User must be authenticated');
  });

  it('should throw error when user is not a client', async () => {
    // Mock empty client result
    const selectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    mockDb.db.select.mockReturnValue(selectChain);

    await expect(
      service.create({
        title: 'Test Project',
        description: 'Test description',
        requiredSkills: ['JavaScript'],
        duration: 12,
        category: 'web_development',
      }),
    ).rejects.toThrow('Only clients can create projects');
  });
});
