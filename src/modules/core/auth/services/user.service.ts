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
   * Find user by Appwrite ID
   */
  async findByAppwriteId(appwriteId: string): Promise<User | null> {
    const result = await this.db.db
      .select()
      .from(users)
      .where(eq(users.appwriteId, appwriteId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create user with client profile
   */
  async createClient(
    userData: NewUser,
    clientData: Omit<NewClient, 'userId'>,
  ): Promise<{ user: User; client: any }> {
    return await this.db.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();

      const [client] = await tx
        .insert(clients)
        .values({ ...clientData, userId: user.id })
        .returning();

      return { user, client };
    });
  }

  /**
   * Create user with supervisor profile
   */
  async createSupervisor(
    userData: NewUser,
    supervisorData: Omit<NewSupervisor, 'userId'>,
  ): Promise<{ user: User; supervisor: any }> {
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

      const [supervisor] = await tx
        .insert(supervisors)
        .values({ ...supervisorData, userId: user.id })
        .returning();

      return { user, supervisor };
    });
  }

  /**
   * Create user with student profile
   */
  async createStudent(
    userData: NewUser,
    studentData: Omit<NewStudent, 'userId'>,
  ): Promise<{ user: User; student: any }> {
    return await this.db.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();

      const [student] = await tx
        .insert(students)
        .values({ ...studentData, userId: user.id })
        .returning();

      return { user, student };
    });
  }

  /**
   * Create user with university profile
   */
  async createUniversity(
    userData: NewUser,
    universityData: Omit<NewUniversity, 'userId'>,
  ): Promise<{ user: User; university: any }> {
    return await this.db.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();

      const [university] = await tx
        .insert(universities)
        .values({ ...universityData, userId: user.id })
        .returning();

      return { user, university };
    });
  }

  /**
   * Get user with profile based on role
   */
  async getUserWithProfile(userId: string): Promise<any> {
    const user = await this.findById(userId);
    if (!user) return null;

    let profile;

    switch (user.role) {
      case 'client':
        [profile] = await this.db.db
          .select()
          .from(clients)
          .where(eq(clients.userId, userId))
          .execute();
        break;

      case 'supervisor':
        [profile] = await this.db.db
          .select()
          .from(supervisors)
          .where(eq(supervisors.userId, userId))
          .execute();
        break;

      case 'student':
        [profile] = await this.db.db
          .select()
          .from(students)
          .where(eq(students.userId, userId))
          .execute();
        break;

      case 'university':
        [profile] = await this.db.db
          .select()
          .from(universities)
          .where(eq(universities.userId, userId))
          .execute();
        break;
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

    return updated;
  }
}
