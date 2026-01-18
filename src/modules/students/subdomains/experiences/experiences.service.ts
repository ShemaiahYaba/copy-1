// ============================================================================
// STUDENT EXPERIENCES SERVICE (DOMAIN)
// src/modules/students/subdomains/experiences/experiences.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { ExperiencesService } from '@modules/core/experiences/experiences.service';
import { ProjectsService } from '@modules/core/projects/projects.service';
import { ContextService } from '@modules/shared/context/context.service';
import { AppError } from '@shared/error/classes/app-error.class';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import type { StudentExperienceFiltersDto } from './dto/experience-filters.dto';
import type {
  ExperienceCardEntity,
  ExperienceRowEntity,
  ExperienceDetailEntity,
} from './entities/experience-card.entity';

@Injectable()
export class StudentExperiencesService {
  constructor(
    private readonly experiencesService: ExperiencesService,
    private readonly projectsService: ProjectsService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Get student experiences (grid or list view)
   */
  async getExperiences(filters: StudentExperienceFiltersDto) {
    const { studentId, universityId, role } = this.contextService.getContext();

    if (!studentId || role !== 'student') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Only students can access experiences',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const result = await this.experiencesService.findAll({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    let filteredItems = result.items;

    if (filters.filter === 'CREATED') {
      filteredItems = filteredItems.filter((exp) => exp.createdBy === studentId);
    } else if (filters.filter === 'SHARED') {
      filteredItems = [];
    }

    if (filters.view === 'GRID') {
      const cards: ExperienceCardEntity[] = filteredItems.map((exp) =>
        this.mapToCard(exp),
      );

      return {
        cards,
        rows: undefined,
        total: cards.length,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(cards.length / (filters.limit || 10)),
        hasNextPage: cards.length > (filters.limit || 10),
        hasPreviousPage: (filters.page || 1) > 1,
      };
    }

    const rows: ExperienceRowEntity[] = filteredItems.map((exp) =>
      this.mapToRow(exp),
    );

    return {
      cards: undefined,
      rows,
      total: rows.length,
      page: filters.page || 1,
      limit: filters.limit || 10,
      totalPages: Math.ceil(rows.length / (filters.limit || 10)),
      hasNextPage: rows.length > (filters.limit || 10),
      hasPreviousPage: (filters.page || 1) > 1,
    };
  }

  /**
   * Get single experience detail
   */
  async getExperienceDetail(
    experienceId: string,
  ): Promise<ExperienceDetailEntity> {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const experience = await this.experiencesService.findById(experienceId);

    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'You can only view your own experiences',
      );
    }

    let recommendedProjects: any[] = [];
    if (experience.status === 'PUBLISHED') {
      const projectsResult = await this.projectsService.findAll({
        status: 'published',
        approvalStatus: 'approved',
        isPublished: true,
        limit: 3,
      });
      recommendedProjects = projectsResult.items.slice(0, 3);
    }

    return this.mapToDetail(experience, recommendedProjects);
  }

  /**
   * Create experience (draft)
   */
  async createExperience(dto: any) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const existing = await this.experiencesService.findAll({
      status: 'DRAFT',
    });

    const studentDrafts = existing.items.filter(
      (exp) => exp.createdBy === studentId,
    );

    if (studentDrafts.length >= 5) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Maximum draft limit reached (5)',
        { currentDrafts: studentDrafts.length },
      );
    }

    return this.experiencesService.create(dto);
  }

  /**
   * Update experience
   */
  async updateExperience(experienceId: string, dto: any) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only update your own experiences',
      );
    }

    return this.experiencesService.update(experienceId, dto);
  }

  /**
   * Publish experience
   */
  async publishExperience(experienceId: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only publish your own experiences',
      );
    }

    const published = await this.experiencesService.findAll({
      status: 'PUBLISHED',
    });

    const studentPublished = published.items.filter(
      (exp) => exp.createdBy === studentId,
    );

    if (studentPublished.length >= 10) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Maximum published experiences limit reached (10)',
        { currentPublished: studentPublished.length },
      );
    }

    return this.experiencesService.publish(experienceId);
  }

  /**
   * Archive experience
   */
  async archiveExperience(experienceId: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only archive your own experiences',
      );
    }

    return this.experiencesService.archive(experienceId);
  }

  /**
   * Delete experience (drafts only)
   */
  async deleteExperience(experienceId: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only delete your own experiences',
      );
    }

    return this.experiencesService.delete(experienceId);
  }

  // ============================================================================
  // PRIVATE MAPPERS
  // ============================================================================

  private mapToCard(experience: any): ExperienceCardEntity {
    return {
      id: experience.id,
      title: experience.title,
      courseCode: experience.courseCode ?? undefined,
      university: 'Mountain Top University',
      summary: experience.overview?.substring(0, 150) || '',
      skills: experience.tags || [],
      status: experience.status,
      startDate: experience.startDate.toISOString(),
      endDate: experience.endDate.toISOString(),
      matchesCount: experience.matchesCount || 0,
      tags: this.generateTags(experience),
    };
  }

  private mapToRow(experience: any): ExperienceRowEntity {
    return {
      id: experience.id,
      name: experience.title,
      status: experience.status,
      createdBy: 'You',
      createdAt: experience.createdAt.toISOString(),
      endDate: experience.endDate?.toISOString(),
      matchesUrl: `/experiences/${experience.id}/matches`,
    };
  }

  private mapToDetail(
    experience: any,
    recommendedProjects: any[],
  ): ExperienceDetailEntity {
    return {
      id: experience.id,
      title: experience.title,
      courseCode: experience.courseCode ?? undefined,
      duration: {
        start: experience.startDate.toISOString(),
        end: experience.endDate.toISOString(),
        weeks: experience.durationWeeks || 0,
      },
      tags: experience.tags || [],
      status: experience.status,
      overview: experience.overview || '',
      learners: experience.learnerRequirements || [],
      requirements: {
        companyPreferences: experience.companyPreferences,
        prerequisites: experience.prerequisites || [],
      },
      expectedOutcomes: experience.expectedOutcomes || [],
      projectExamples: experience.projectExamples || [],
      mainContact: experience.mainContact || {
        name: 'Unknown',
        role: 'Contact',
        email: 'contact@university.edu',
        institution: 'University',
        location: 'Location',
      },
      members: [],
      recommendedProjects: recommendedProjects.map((project) => ({
        id: project.id,
        title: project.title,
        organization: project.organization || 'Unknown',
        summary: project.description?.substring(0, 100),
        skills: project.requiredSkills || [],
        difficulty: project.difficulty || 'INTERMEDIATE',
      })),
      institution: {
        name: 'Mountain Top University',
        department: 'Computer Science',
        location: 'Ogun State, Nigeria',
        description: 'Leading technology institution',
      },
    };
  }

  private generateTags(experience: any): string[] {
    const tags: string[] = [];

    if (experience.status === 'DRAFT') {
      tags.push('Draft');
    }

    if (experience.tags && experience.tags.length > 3) {
      tags.push(`+${experience.tags.length - 3}`);
    }

    return tags;
  }
}
