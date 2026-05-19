import { Module } from '@nestjs/common';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JobMediaModule } from '../job-media/job-media.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EditorLinkPolicyService } from './editor-link-policy.service';
import { EmployerController } from './employer.controller';
import { EmployerService } from './employer.service';

@Module({
  imports: [SubscriptionsModule, JobMediaModule],
  controllers: [EmployerController],
  providers: [
    EmployerService,
    EditorLinkPolicyService,
    AuthenticatedGuard,
    RolesGuard,
  ],
  exports: [EmployerService],
})
export class EmployerModule {}
