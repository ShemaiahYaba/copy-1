// ============================================================================
// src/modules/auth/services/user.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import {
  users,
  clients,
  supervisors,
  students,
  universities,
  User,
  NewUser,
  NewClient,
  NewSupervisor,
  NewStudent,
  NewUniversity,
} from '../models/user.model';
import { eq } from 'drizzle-orm';

// Type-safe profile types
type ClientProfile = typeof clients.$inferSelect;
type SupervisorProfile = typeof supervisors.$inferSelect;
type StudentProfile = typeof students.$inferSelect;
type UniversityProfile = typeof universities.$inferSelect;

type UserProfile =
  | ClientProfile
  | SupervisorProfile
  | StudentProfile
  | UniversityProfile;

interface UserWithProfile {
  user: User;
  profile: UserProfile | undefined;
}

@Injectable()
export class UserService {
  constructor(private db: DatabaseService) {}

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.db.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create user with client profile
   */
  async createClient(
    userData: NewUser,
    clientData: Omit<NewClient, 'userId'>,
  ): Promise<{ user: User; client: ClientProfile }> {
    return await this.db.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();

      if (!user) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create user',
        );
      }

      const [client] = await tx
        .insert(clients)
        .values({ ...clientData, userId: user.id })
        .returning();

      if (!client) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create client profile',
        );
      }

      return { user, client };
    });
  }

  /**
   * Create user with supervisor profile
   */
  async createSupervisor(
    userData: NewUser,
    supervisorData: Omit<NewSupervisor, 'userId'>,
  ): Promise<{ user: User; supervisor: SupervisorProfile }> {
    // Verify university exists
    const university = await this.db.db
      .select()
      .from(universities)
      .where(eq(universities.id, supervisorData.universityId))
      .limit(1);

    if (!university.length) {
      throw new AppError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'University not found',
        { universityId: supervisorData.universityId },
      );
    }

    return await this.db.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();

      if (!user) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create user',
        );
      }

      const [supervisor] = await tx
        .insert(supervisors)
        .values({ ...supervisorData, userId: user.id })
        .returning();

      if (!supervisor) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create supervisor profile',
        );
      }

      return { user, supervisor };
    });
  }

  /**
   * Create user with student profile
   */
  async createStudent(
    userData: NewUser,
    studentData: Omit<NewStudent, 'userId'>,
  ): Promise<{ user: User; student: StudentProfile }> {
    return await this.db.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();

      if (!user) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create user',
        );
      }

      const [student] = await tx
        .insert(students)
        .values({ ...studentData, userId: user.id })
        .returning();

      if (!student) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create student profile',
        );
      }

      return { user, student };
    });
  }

  /**
   * Create user with university profile
   */
  async createUniversity(
    userData: NewUser,
    universityData: Omit<NewUniversity, 'userId'>,
  ): Promise<{ user: User; university: UniversityProfile }> {
    return await this.db.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();

      if (!user) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create user',
        );
      }

      const [university] = await tx
        .insert(universities)
        .values({ ...universityData, userId: user.id })
        .returning();

      if (!university) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Failed to create university profile',
        );
      }

      return { user, university };
    });
  }

  /**
   * Get user with profile based on role
   */
  async getUserWithProfile(userId: string): Promise<UserWithProfile> {
    const user = await this.findById(userId);

    if (!user) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found', {
        userId,
      });
    }

    let profile: UserProfile | undefined;

    switch (user.role) {
      case 'client': {
        const [clientProfile] = await this.db.db
          .select()
          .from(clients)
          .where(eq(clients.userId, userId))
          .execute();
        profile = clientProfile;
        break;
      }

      case 'supervisor': {
        const [supervisorProfile] = await this.db.db
          .select()
          .from(supervisors)
          .where(eq(supervisors.userId, userId))
          .execute();
        profile = supervisorProfile;
        break;
      }

      case 'student': {
        const [studentProfile] = await this.db.db
          .select()
          .from(students)
          .where(eq(students.userId, userId))
          .execute();
        profile = studentProfile;
        break;
      }

      case 'university': {
        const [universityProfile] = await this.db.db
          .select()
          .from(universities)
          .where(eq(universities.userId, userId))
          .execute();
        profile = universityProfile;
        break;
      }

      default: {
        // Handle unknown role
        const exhaustiveCheck: never = user.role;
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          `Unknown user role: ${exhaustiveCheck as string}`,
        );
      }
    }

    return { user, profile };
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [updated] = await this.db.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found', {
        userId: id,
      });
    }

    return updated;
  }
}
