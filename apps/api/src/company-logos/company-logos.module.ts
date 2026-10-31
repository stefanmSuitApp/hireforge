import { Module } from '@nestjs/common';

import { StaffModule } from '../staff/staff.module';
import { StorageModule } from '../storage/storage.module';
import {
  CompanyLogosPublicController,
  CompanyLogosStaffController,
} from './company-logos.controller';
import { CompanyLogosService } from './company-logos.service';

@Module({
  imports: [StaffModule, StorageModule],
  controllers: [CompanyLogosStaffController, CompanyLogosPublicController],
  providers: [CompanyLogosService],
})
export class CompanyLogosModule {}
