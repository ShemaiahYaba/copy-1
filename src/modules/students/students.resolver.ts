// ============================================================================
// STUDENTS RESOLVER (Parent)
// src/modules/students/students.resolver.ts
// ============================================================================

import { Resolver, Query, Field, ObjectType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { StudentsService } from './students.service';

@ObjectType()
class StudentContext {
  @Field({ nullable: true })
  studentId?: string;

  @Field({ nullable: true })
  universityId?: string;

  @Field({ nullable: true })
  role?: string;
}

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsResolver {
  constructor(private readonly studentsService: StudentsService) {}

  @Query(() => StudentContext, { name: 'studentContext' })
  @Roles('student')
  getContext(@CurrentUser() _user: User) {
    // eslint-disable-line @typescript-eslint/no-unused-vars
    return this.studentsService.getStudentContext();
  }
}
