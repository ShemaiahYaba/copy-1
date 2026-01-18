/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// ============================================================================
// STUDENT EXPERIENCES SERVICE TESTS
// src/modules/students/subdomains/experiences/_tests_/experiences.service.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { StudentExperiencesService } from '../experiences.service';
import { ExperiencesService } from '@modules/core/experiences/experiences.service';
import { ProjectsService } from '@modules/core/projects/projects.service';
import { ContextService } from '@modules/shared/context/context.service';
import { AppError } from '@shared/error/classes/app-error.class';

describe('StudentExperiencesService', () => {
  let service: StudentExperiencesService;
  let mockExperiences: jest.Mocked<ExperiencesService>;
  let mockProjects: jest.Mocked<ProjectsService>;
  let mockContext: jest.Mocked<ContextService>;

  const mockStudentId = 'student-123';
  const mockUniversityId = 'univ-456';

  beforeEach(async () => {
    mockExperiences = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      archive: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockProjects = {
      findAll: jest.fn(),
    } as any;

    mockContext = {
      getContext: jest.fn().mockReturnValue({
        studentId: mockStudentId,
        universityId: mockUniversityId,
        role: 'student',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentExperiencesService,
        { provide: ExperiencesService, useValue: mockExperiences },
        { provide: ProjectsService, useValue: mockProjects },
        { provide: ContextService, useValue: mockContext },
      ],
    }).compile();

    service = module.get<StudentExperiencesService>(StudentExperiencesService);
  });

  describe('getExperiences', () => {
    it('should throw when not a student', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({
        studentId: mockStudentId,
        universityId: mockUniversityId,
        role: 'supervisor',
      });

      await expect(service.getExperiences({} as any)).rejects.toThrow(AppError);
    });

    it('should throw when universityId missing', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({
        studentId: mockStudentId,
        role: 'student',
      });

      await expect(service.getExperiences({} as any)).rejects.toThrow(
        'University context required',
      );
    });

    it('should return grid cards for created filter', async () => {
      mockExperiences.findAll.mockResolvedValue({
        items: [
          {
            id: 'exp-1',
            title: 'Experience 1',
            overview: 'Overview',
            tags: ['Tag1'],
            status: 'DRAFT',
            createdBy: mockStudentId,
            startDate: new Date(),
            endDate: new Date(),
          },
          {
            id: 'exp-2',
            title: 'Experience 2',
            overview: 'Overview',
            tags: ['Tag2'],
            status: 'DRAFT',
            createdBy: 'other',
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
      } as any);

      const result = await service.getExperiences({
        view: 'GRID',
        filter: 'CREATED',
      } as any);

      expect(result.cards).toHaveLength(1);
      expect(result.rows).toBeUndefined();
    });

    it('should return list rows', async () => {
      mockExperiences.findAll.mockResolvedValue({
        items: [
          {
            id: 'exp-1',
            title: 'Experience 1',
            overview: 'Overview',
            tags: ['Tag1'],
            status: 'DRAFT',
            createdBy: mockStudentId,
            startDate: new Date(),
            endDate: new Date(),
            createdAt: new Date(),
          },
        ],
      } as any);

      const result = await service.getExperiences({
        view: 'LIST',
        filter: 'ALL',
      } as any);

      expect(result.rows).toHaveLength(1);
      expect(result.cards).toBeUndefined();
    });
  });

  describe('getExperienceDetail', () => {
    it('should throw when not authenticated', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({});

      await expect(service.getExperienceDetail('exp-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should throw when not owner', async () => {
      mockExperiences.findById.mockResolvedValue({
        id: 'exp-1',
        createdBy: 'other',
      } as any);

      await expect(service.getExperienceDetail('exp-1')).rejects.toThrow(
        'You can only view your own experiences',
      );
    });

    it('should return detail with recommendations', async () => {
      mockExperiences.findById.mockResolvedValue({
        id: 'exp-1',
        title: 'Experience 1',
        status: 'PUBLISHED',
        createdBy: mockStudentId,
        startDate: new Date(),
        endDate: new Date(),
      } as any);

      mockProjects.findAll.mockResolvedValue({
        items: [
          {
            id: 'proj-1',
            title: 'Project 1',
            organization: 'Org',
            description: 'Desc',
            requiredSkills: ['React'],
            difficulty: 'INTERMEDIATE',
          },
        ],
      } as any);

      const result = await service.getExperienceDetail('exp-1');

      expect(result.recommendedProjects).toHaveLength(1);
    });
  });

  describe('createExperience', () => {
    it('should enforce draft limits', async () => {
      mockExperiences.findAll.mockResolvedValue({
        items: Array.from({ length: 5 }).map((_, i) => ({
          id: `exp-${i}`,
          createdBy: mockStudentId,
        })),
      } as any);

      await expect(service.createExperience({} as any)).rejects.toThrow(
        'Maximum draft limit reached (5)',
      );
    });
  });

  describe('updateExperience', () => {
    it('should throw when not owner', async () => {
      mockExperiences.findById.mockResolvedValue({
        id: 'exp-1',
        createdBy: 'other',
      } as any);

      await expect(
        service.updateExperience('exp-1', {} as any),
      ).rejects.toThrow('You can only update your own experiences');
    });
  });

  describe('publishExperience', () => {
    it('should enforce publish limits', async () => {
      mockExperiences.findById.mockResolvedValue({
        id: 'exp-1',
        createdBy: mockStudentId,
      } as any);

      mockExperiences.findAll.mockResolvedValue({
        items: Array.from({ length: 10 }).map((_, i) => ({
          id: `exp-${i}`,
          createdBy: mockStudentId,
        })),
      } as any);

      await expect(service.publishExperience('exp-1')).rejects.toThrow(
        'Maximum published experiences limit reached (10)',
      );
    });
  });

  describe('archiveExperience', () => {
    it('should throw when not owner', async () => {
      mockExperiences.findById.mockResolvedValue({
        id: 'exp-1',
        createdBy: 'other',
      } as any);

      await expect(service.archiveExperience('exp-1')).rejects.toThrow(
        'You can only archive your own experiences',
      );
    });
  });

  describe('deleteExperience', () => {
    it('should throw when not owner', async () => {
      mockExperiences.findById.mockResolvedValue({
        id: 'exp-1',
        createdBy: 'other',
      } as any);

      await expect(service.deleteExperience('exp-1')).rejects.toThrow(
        'You can only delete your own experiences',
      );
    });
  });
});
