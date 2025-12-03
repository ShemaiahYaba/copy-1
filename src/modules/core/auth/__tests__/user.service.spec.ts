// src/modules/auth/__tests__/user.service.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../services/user.service';
import { DatabaseService } from '@database/database.service';
import { eq } from 'drizzle-orm';
import {
  users,
  clients,
  supervisors,
  students,
  universities,
} from '../models/user.model';
import { AppError } from '@shared/error/classes/app-error.class';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';

// Test data
const mockUser = {
  id: 'user-123',
  email: 'test@test.com',
  role: 'client' as const,
  appwriteId: 'appwrite-123',
  name: 'Test User',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockClient = {
  id: 'client-123',
  userId: 'user-123',
  organizationName: 'Test Company',
  industry: 'Technology',
  phone: '1234567890',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSupervisor = {
  id: 'supervisor-123',
  userId: 'user-123',
  universityId: 'uni-123',
  department: 'Computer Science',
  title: 'Professor',
};

const mockStudent = {
  id: 'student-123',
  userId: 'user-123',
  matricNumber: 'STD-2023-123',
  program: 'Computer Science',
  year: 3,
  graduationStatus: 'active' as const,
  skills: ['JavaScript', 'TypeScript'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUniversity = {
  id: 'uni-123',
  userId: 'user-123',
  name: 'Test University',
  address: '123 Test St',
  website: 'https://test.edu',
};

describe('UserService', () => {
  let service: UserService;
  let db: jest.Mocked<DatabaseService>;
  let mockQuery: any;

  beforeEach(async () => {
    // Setup mock query builder
    mockQuery = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([mockUser]),
      set: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockImplementation((data) => {
        if (data === users) return Promise.resolve([mockUser]);
        if (data === clients) return Promise.resolve([mockClient]);
        if (data === supervisors) return Promise.resolve([mockSupervisor]);
        if (data === students) return Promise.resolve([mockStudent]);
        if (data === universities) return Promise.resolve([mockUniversity]);
        return Promise.resolve([{}]);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DatabaseService,
          useValue: {
            db: {
              select: jest.fn().mockReturnThis(),
              insert: jest.fn().mockReturnThis(),
              update: jest.fn().mockReturnThis(),
              delete: jest.fn().mockReturnThis(),
              from: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              values: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              returning: jest.fn().mockImplementation((data) => {
                if (data === users) return Promise.resolve([mockUser]);
                if (data === clients) return Promise.resolve([mockClient]);
                if (data === supervisors)
                  return Promise.resolve([mockSupervisor]);
                if (data === students) return Promise.resolve([mockStudent]);
                if (data === universities)
                  return Promise.resolve([mockUniversity]);
                return Promise.resolve([{}]);
              }),
              transaction: jest.fn((callback) => {
                const mockTx = {
                  ...db.db,
                  insert: jest.fn().mockImplementation((table) => ({
                    values: jest.fn().mockImplementation((data) => ({
                      returning: jest.fn().mockImplementation(() => {
                        if (table === users) {
                          const user = {
                            ...mockUser,
                            ...data,
                            role: data.role || mockUser.role,
                          };
                          if (data.email) user.email = data.email;
                          return Promise.resolve([user]);
                        }
                        if (table === clients)
                          return Promise.resolve([{ ...mockClient, ...data }]);
                        if (table === supervisors)
                          return Promise.resolve([
                            { ...mockSupervisor, ...data },
                          ]);
                        if (table === students)
                          return Promise.resolve([{ ...mockStudent, ...data }]);
                        if (table === universities)
                          return Promise.resolve([
                            { ...mockUniversity, ...data },
                          ]);
                        return Promise.resolve([{}]);
                      }),
                    })),
                  })),
                  select: jest.fn().mockImplementation(() => ({
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockResolvedValue([mockUniversity]),
                  })),
                  from: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  limit: jest.fn().mockResolvedValue([mockUniversity]),
                };
                return callback(mockTx);
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    db = module.get(DatabaseService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };

      (db.db.select as jest.Mock).mockReturnValue(mockQuery);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(db.db.select).toHaveBeenCalled();
      expect(mockQuery.from).toHaveBeenCalledWith(users);
      expect(mockQuery.where).toHaveBeenCalledWith(
        eq(users.email, 'test@test.com'),
      );
    });

    it('should return null if user not found', async () => {
      const emptyQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      (db.db.select as jest.Mock).mockReturnValue(emptyQuery);

      const result = await service.findByEmail('nonexistent@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };

      (db.db.select as jest.Mock).mockReturnValue(mockQuery);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(db.db.select).toHaveBeenCalled();
      expect(mockQuery.from).toHaveBeenCalledWith(users);
      expect(mockQuery.where).toHaveBeenCalledWith(eq(users.id, 'user-123'));
    });

    it('should return null if user not found by id', async () => {
      const emptyQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      (db.db.select as jest.Mock).mockReturnValue(emptyQuery);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByAppwriteId', () => {
    it('should find user by appwrite id', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };

      (db.db.select as jest.Mock).mockReturnValue(mockQuery);

      const result = await service.findByAppwriteId('appwrite-123');

      expect(result).toEqual(mockUser);
      expect(db.db.select).toHaveBeenCalled();
      expect(mockQuery.from).toHaveBeenCalledWith(users);
      expect(mockQuery.where).toHaveBeenCalledWith(
        eq(users.appwriteId, 'appwrite-123'),
      );
    });
  });

  describe('createClient', () => {
    it('should create a new client user', async () => {
      const userData = {
        id: 'client-user-123',
        email: 'client@test.com',
        role: 'client' as const,
        appwriteId: 'appwrite-client-123',
        name: 'Client User',
        isActive: true,
        emailVerified: true,
      };

      const clientData = {
        organizationName: 'Client Company',
        industry: 'Technology',
        phone: '1234567890',
      };

      const result = await service.createClient(userData, clientData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('client');
      expect(result.user.role).toBe('client');
      expect(result.user.email).toBe('client@test.com');
      expect(result.client.organizationName).toBe(clientData.organizationName);
      expect(db.db.transaction).toHaveBeenCalled();
    });
  });

  describe('createSupervisor', () => {
    it('should create a new supervisor user', async () => {
      // Mock university check
      const mockUniQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUniversity]),
      };
      (db.db.select as jest.Mock).mockReturnValueOnce(mockUniQuery);

      const userData = {
        id: 'supervisor-user-123',
        email: 'supervisor@test.com',
        role: 'supervisor' as const,
        appwriteId: 'appwrite-supervisor-123',
        name: 'Supervisor User',
        isActive: true,
        emailVerified: true,
      };

      const supervisorData = {
        universityId: 'uni-123',
        department: 'Computer Science',
        title: 'Professor',
      };

      const result = await service.createSupervisor(userData, supervisorData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('supervisor');
      expect(result.user.role).toBe('supervisor');
      expect(result.supervisor.department).toBe('Computer Science');
    });

    it('should throw error if university not found', async () => {
      const userData = {
        id: 'supervisor-user-123',
        email: 'supervisor@test.com',
        role: 'supervisor' as const,
        appwriteId: 'appwrite-supervisor-123',
        name: 'Supervisor User',
        isActive: true,
        emailVerified: true,
      };

      const supervisorData = {
        universityId: 'nonexistent-uni',
        department: 'Computer Science',
        title: 'Professor',
      };

      // Mock university not found
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      (db.db.select as jest.Mock).mockReturnValue(mockQuery);

      await expect(
        service.createSupervisor(userData, supervisorData),
      ).rejects.toThrow(AppError);
    });
  });

  describe('createStudent', () => {
    it('should create a new student user', async () => {
      const userData = {
        id: 'student-user-123',
        email: 'student@test.com',
        role: 'student' as const,
        appwriteId: 'appwrite-student-123',
        name: 'Student User',
        isActive: true,
        emailVerified: true,
      };

      const studentData = {
        matricNumber: 'STD-2023-456',
        graduationStatus: 'active' as const,
        program: 'Computer Science',
        year: 2,
        skills: ['JavaScript', 'TypeScript'],
      };

      const result = await service.createStudent(userData, studentData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('student');
      expect(result.user.role).toBe('student');
      expect(result.student.program).toBe('Computer Science');
    });
  });

  describe('createUniversity', () => {
    it('should create a new university user', async () => {
      const userData = {
        id: 'university-user-123',
        email: 'university@test.com',
        role: 'university' as const,
        appwriteId: 'appwrite-uni-123',
        name: 'University Admin',
        isActive: true,
        emailVerified: true,
      };

      const universityData = {
        name: 'Test University',
        address: '123 Test St',
        website: 'https://test.edu',
      };

      const result = await service.createUniversity(userData, universityData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('university');
      expect(result.user.role).toBe('university');
      expect(result.university.name).toBe('Test University');
    });
  });

  describe('getUserWithProfile', () => {
    it('should get user with client profile', async () => {
      // Setup test data
      const clientUser = {
        ...mockUser,
        id: 'user-123',
        role: 'client' as const,
        name: 'Client User',
        isActive: true,
        emailVerified: true,
      };

      // Mock findById to return our test user
      jest.spyOn(service, 'findById').mockResolvedValue(clientUser);

      // Create a mock query result that matches what the service expects
      const mockQueryResult = [{ ...mockClient, userId: 'user-123' }];

      // Create a mock for the execute method that returns our test data
      const mockExecute = jest.fn().mockResolvedValue(mockQueryResult);

      // Create a chainable mock for the query builder
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        execute: mockExecute,
      };

      // Mock the database select to return our query builder
      (db.db.select as jest.Mock).mockReturnValue(mockQueryBuilder);

      // Call the method
      const result = await service.getUserWithProfile('user-123');

      // Verify the result
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('profile');
      expect(result.user.role).toBe('client');
      expect(result.profile).toHaveProperty('organizationName');

      // Verify the query was built correctly
      expect(db.db.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(clients);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        eq(clients.userId, 'user-123'),
      );
      expect(mockExecute).toHaveBeenCalled();
    });

    // Similar tests for other roles can be added here
    it('should handle unknown role', async () => {
      const unknownUser = {
        ...mockUser,
        role: 'unknown' as any,
        name: 'Unknown User',
        isActive: true,
        emailVerified: true,
      };
      jest.spyOn(service, 'findById').mockResolvedValue(unknownUser);

      const result = await service.getUserWithProfile('user-123');

      expect(result).toHaveProperty('user');
      expect(result.profile).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const updateData = { email: 'updated@test.com' };
      const updatedUser = { ...mockUser, ...updateData };

      const mockUpdateQuery = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedUser]),
      };

      (db.db.update as jest.Mock).mockReturnValue(mockUpdateQuery);

      const result = await service.updateUser('user-123', updateData);

      expect(result.email).toBe('updated@test.com');
      expect(db.db.update).toHaveBeenCalledWith(users);
      expect(mockUpdateQuery.set).toHaveBeenCalledWith(
        expect.objectContaining(updateData),
      );
      expect(mockUpdateQuery.where).toHaveBeenCalledWith(
        eq(users.id, 'user-123'),
      );
    });
  });
});
