import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { PublicJobsService } from './public-jobs.service';

/** Public list of employer organizations (companies with published jobs). */
@Controller('public/employers')
@UseGuards(AuthenticatedGuard)
export class PublicEmployersController {
  constructor(private readonly publicJobs: PublicJobsService) {}

  @Get()
  directory() {
    return this.publicJobs.listEmployersDirectory();
  }
}
