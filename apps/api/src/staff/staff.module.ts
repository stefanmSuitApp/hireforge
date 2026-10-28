import { Module } from '@nestjs/common';

import { AdminController } from '../admin/admin.controller';
import { AdminPromoCodesService } from '../admin/admin-promo-codes.service';
import { AdminService } from '../admin/admin.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StaffAuditService } from './staff-audit.service';
import { StaffCompaniesController } from './staff-companies.controller';
import { StaffCompaniesService } from './staff-companies.service';
import { StaffEmployersController } from './staff-employers.controller';
import { StaffEmployersService } from './staff-employers.service';
import { StaffJoinRequestsController } from './staff-join-requests.controller';
import { StaffJoinRequestsService } from './staff-join-requests.service';

@Module({
  imports: [SubscriptionsModule],
  providers: [
    StaffAuditService,
    StaffCompaniesService,
    StaffEmployersService,
    StaffJoinRequestsService,
    AdminService,
    AdminPromoCodesService,
  ],
  controllers: [
    StaffCompaniesController,
    StaffEmployersController,
    StaffJoinRequestsController,
    AdminController,
  ],
  exports: [StaffAuditService],
})
export class StaffModule {}
