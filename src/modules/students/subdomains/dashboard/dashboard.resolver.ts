// ============================================================================
// STUDENT DASHBOARD RESOLVER
// src/modules/students/subdomains/dashboard/dashboard.resolver.ts
// ============================================================================

import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { StudentDashboardService } from './dashboard.service';
import { StudentDashboardEntity } from './entities/dashboard.entity';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';

@Resolver(() => StudentDashboardEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentDashboardResolver {
  constructor(private readonly dashboardService: StudentDashboardService) {}

  @Query(() => StudentDashboardEntity, { name: 'studentDashboard' })
  @Roles('student')
  async getDashboard(
    @Args('filters', { nullable: true }) filters: DashboardFiltersDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.dashboardService.getDashboard(filters || {});
  }
}
