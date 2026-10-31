import { Module } from '@nestjs/common';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JobMediaModule } from '../job-media/job-media.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EditorLinkPolicyService } from './editor-link-policy.service';
import { EmployerApplicationsService } from './employer-applications.service';
import { EmployerController } from './employer.controller';
import { EmployerService } from './employer.service';

@Module({
  imports: [SubscriptionsModule, JobMediaModule, StorageModule],
  controllers: [EmployerController],
  providers: [
    EmployerService,
    EmployerApplicationsService,
    EditorLinkPolicyService,
    AuthenticatedGuard,
    RolesGuard,
  ],
  exports: [EmployerService],
})
export class EmployerModule {}
