import {
  Controller,
  Get,
  Injectable,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { publicJobsEnabled } from 'shared';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { PublicJobsService } from './public-jobs.service';

/** Anonymous access while `PUBLIC_JOBS` is on (default); login otherwise. */
@Injectable()
class PublicJobsOrAuthenticatedGuard implements CanActivate {
  private readonly authenticated = new AuthenticatedGuard();

  canActivate(context: ExecutionContext) {
    return publicJobsEnabled() || this.authenticated.canActivate(context);
  }
}

/** Public list of employer organizations (companies with live jobs). */
@Controller('public/employers')
@UseGuards(PublicJobsOrAuthenticatedGuard)
export class PublicEmployersController {
  constructor(private readonly publicJobs: PublicJobsService) {}

  @Get()
  directory() {
    return this.publicJobs.listEmployersDirectory();
  }
}
