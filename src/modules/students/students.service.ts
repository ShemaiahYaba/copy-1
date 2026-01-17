// ============================================================================
// STUDENTS SERVICE (Parent)
// src/modules/students/students.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { ContextService } from '@modules/shared/context/context.service';

@Injectable()
export class StudentsService {
  constructor(private readonly contextService: ContextService) {}

  getStudentContext() {
    const context = this.contextService.getContext();
    return {
      studentId: context.studentId,
      universityId: context.universityId,
      role: context.role,
    };
  }
}
