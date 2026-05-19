import { Module } from '@nestjs/common';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EmployerModule } from '../employer/employer.module';
import { StaffModule } from '../staff/staff.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

import { JobMediaModule } from '../job-media/job-media.module';

@Module({
  imports: [SubscriptionsModule, StaffModule, EmployerModule, JobMediaModule],
  controllers: [ModerationController],
  providers: [ModerationService, AuthenticatedGuard, RolesGuard],
})
export class ModerationModule {}
