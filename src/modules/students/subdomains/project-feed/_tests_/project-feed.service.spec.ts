/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// ============================================================================
// PROJECT FEED SERVICE TESTS
// src/modules/students/subdomains/project-feed/_tests_/project-feed.service.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { ProjectFeedService } from '../project-feed.service';
import { ProjectsService } from '@modules/core/projects/projects.service';
import { BookmarksService } from '@modules/core/bookmarks/bookmarks.service';
import { ContextService } from '@modules/shared/context/context.service';
import { AppError } from '@shared/error/classes/app-error.class';

describe('ProjectFeedService', () => {
  let service: ProjectFeedService;
  let mockProjects: jest.Mocked<ProjectsService>;
  let mockBookmarks: jest.Mocked<BookmarksService>;
  let mockContext: jest.Mocked<ContextService>;

  const mockStudentId = 'student-123';
  const mockUniversityId = 'univ-456';

  beforeEach(async () => {
    mockProjects = {
      findAll: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockBookmarks = {
      findAll: jest.fn(),
      create: jest.fn(),
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
        ProjectFeedService,
        { provide: ProjectsService, useValue: mockProjects },
        { provide: BookmarksService, useValue: mockBookmarks },
        { provide: ContextService, useValue: mockContext },
      ],
    }).compile();

    service = module.get<ProjectFeedService>(ProjectFeedService);
  });

  describe('getProjectFeed', () => {
    it('should throw when not a student', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({
        studentId: mockStudentId,
        universityId: mockUniversityId,
        role: 'supervisor',
      });

      await expect(service.getProjectFeed({} as any)).rejects.toThrow(AppError);
    });

    it('should throw when universityId missing', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({
        studentId: mockStudentId,
        role: 'student',
      });

      await expect(service.getProjectFeed({} as any)).rejects.toThrow(
        'University context required',
      );
    });

    it('should filter categories and enrich bookmark tags', async () => {
      const projects = [
        {
          id: 'p1',
          clientId: 'client-1',
          universityId: 'univ-456',
          createdBy: 'user-1',
          title: 'Project 1',
          description: 'Desc',
          organization: 'Org',
          organizationLogoUrl: null,
          difficulty: 'ROOKIE' as const,
          requiredSkills: ['React'],
          tags: ['tag1'],
          category: 'web_development' as const,
          status: 'published' as const,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
          duration: 10,
          teamSize: 1,
          isPublished: true,
          approvalStatus: 'approved' as const,
        },
        {
          id: 'p2',
          clientId: 'client-2',
          universityId: 'univ-456',
          createdBy: 'user-2',
          title: 'Project 2',
          description: 'Desc',
          organization: 'Org',
          organizationLogoUrl: null,
          difficulty: 'INTERMEDIATE' as const,
          requiredSkills: ['Python'],
          tags: [],
          category: 'data_science' as const,
          status: 'published' as const,
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
          updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          duration: 12,
          teamSize: 2,
          isPublished: true,
          approvalStatus: 'approved' as const,
        },
      ] as any[];

      mockProjects.findAll.mockResolvedValue({
        items: projects,
        total: 2,
        page: 1,
        limit: 9,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      mockBookmarks.findAll.mockResolvedValue({
        cards: [{ id: 'b1', projectId: 'p1' }],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      } as any);

      const result = await service.getProjectFeed({
        categories: ['web_development'],
      } as any);

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].id).toBe('p1');
      expect(result.cards[0].tags).toEqual(
        expect.arrayContaining(['Bookmarked', 'tag1']),
      );
      expect(result.filtersMeta.availableCategories).toEqual(
        expect.arrayContaining(['web_development', 'data_science']),
      );
    });
  });

  describe('searchProjects', () => {
    it('should throw when not authenticated', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({});

      await expect(service.searchProjects('term')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should return card ids', async () => {
      mockProjects.findAll.mockResolvedValue({
        items: [{ id: 'p1' }, { id: 'p2' }],
      } as any);

      const result = await service.searchProjects('term');

      expect(result.cardIds).toEqual(['p1', 'p2']);
    });
  });

  describe('expressInterest', () => {
    it('should throw when not authenticated', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({});

      await expect(service.expressInterest('p1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should throw not implemented after validating project', async () => {
      mockProjects.findById.mockResolvedValue({ id: 'p1' } as any);

      await expect(service.expressInterest('p1')).rejects.toThrow(
        'Express interest feature coming soon',
      );
      expect(mockProjects.findById).toHaveBeenCalledWith('p1');
    });
  });

  describe('bookmarkProject', () => {
    it('should delegate to bookmarks service', async () => {
      mockBookmarks.create.mockResolvedValue({ id: 'b1' } as any);

      await service.bookmarkProject('p1');

      expect(mockBookmarks.create).toHaveBeenCalledWith({ projectId: 'p1' });
    });
  });
});
