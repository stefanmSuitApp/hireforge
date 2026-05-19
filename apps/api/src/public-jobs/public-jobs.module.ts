import { Module } from '@nestjs/common';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { PublicEmployersController } from './public-employers.controller';
import { PublicJobsController } from './public-jobs.controller';
import { PublicJobsService } from './public-jobs.service';

@Module({
  controllers: [PublicJobsController, PublicEmployersController],
  providers: [PublicJobsService, AuthenticatedGuard],
})
export class PublicJobsModule {}
