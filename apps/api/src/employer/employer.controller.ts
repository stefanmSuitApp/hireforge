import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { z } from 'zod';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { codedBadRequest } from '../http/coded-http';
import { EmployerService } from './employer.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { employerJobDraftBodySchema } from 'contracts';

const MAX_JOB_DESCRIPTION_IMAGE_BYTES = 2 * 1024 * 1024;

@Controller('employer')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('employer')
export class EmployerController {
  constructor(
    private readonly employer: EmployerService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  private userId(req: Request): string {
    const id = req.hireforgeUser?.id;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }

  @Get('workspace')
  workspace(@Req() req: Request) {
    return this.employer.getWorkspace(this.userId(req));
  }

  @Get('packages')
  listPackagesCatalog() {
    return this.employer.listPackageCatalogForEmployer();
  }

  @Get('subscriptions')
  listEmployerSubscriptions(@Req() req: Request) {
    return this.employer.listEmployerSubscriptions(this.userId(req));
  }

  @Get('billing/proformas/:id/pdf')
  async getProformaPdf(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const { buffer, filename } =
      await this.employer.getEmployerProformaPdfForDownload(
        this.userId(req),
        id,
      );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    });
  }

  @Get('billing/proformas/:id')
  getProforma(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.employer.getEmployerProforma(this.userId(req), id);
  }

  @Get('jobs')
  listJobs(@Req() req: Request) {
    return this.employer.listCompanyJobs(this.userId(req));
  }

  /** Must be registered before `@Post('jobs/:id/submit')` or `POST /jobs` can 404 (Express route order). */
  @Post('jobs')
  createDraft(@Req() req: Request, @Body() body: unknown) {
    const parsed = employerJobDraftBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.employer.createDraftJob(this.userId(req), parsed.data);
  }

  @Get('jobs/:id/applications')
  listApplications(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.employer.listJobApplications(this.userId(req), id);
  }

  @Post('jobs/:id/submit')
  submitJob(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.employer.submitJobForModeration(this.userId(req), id);
  }

  /** Multipart (`file`): PNG/JPEG → AVIF blob; entitlement `editor.image_upload` required. */
  @Post('jobs/:id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_JOB_DESCRIPTION_IMAGE_BYTES },
    }),
  )
  uploadJobDescriptionImage(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw codedBadRequest(
        'JOB_DESCRIPTION_IMAGE_PAYLOAD_MISSING',
        'Missing file field "file".',
      );
    }
    return this.employer.uploadEmployerJobDescriptionImage(
      this.userId(req),
      id,
      file,
    );
  }

  @Get('jobs/:id')
  getJob(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.employer.getEmployerJob(this.userId(req), id);
  }

  @Patch('jobs/:id')
  updateDraft(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = employerJobDraftBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.employer.updateDraftJob(this.userId(req), id, parsed.data);
  }

  @Post('subscriptions')
  createSubscription(@Req() req: Request, @Body() body: unknown) {
    return this.subscriptions.createEmployerPurchase(this.userId(req), body);
  }
}
