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

@Module({
  imports: [SubscriptionsModule],
  providers: [
    StaffAuditService,
    StaffCompaniesService,
    StaffEmployersService,
    AdminService,
    AdminPromoCodesService,
  ],
  controllers: [
    StaffCompaniesController,
    StaffEmployersController,
    AdminController,
  ],
  exports: [StaffAuditService],
})
export class StaffModule {}
