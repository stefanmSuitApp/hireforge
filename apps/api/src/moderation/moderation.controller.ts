import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  employerJobDraftBodySchema,
  moderatorCreateJobDraftBodySchema,
  moderatorJobQueueQuerySchema,
  moderatorMarkSubscriptionPaidBodySchema,
  moderatorRejectBodySchema,
} from 'contracts';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { z } from 'zod';

import { FileInterceptor } from '@nestjs/platform-express';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { codedBadRequest } from '../http/coded-http';
import { ModerationService } from './moderation.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

import { JobDescriptionMediaService } from '../job-media/job-description-media.service';

const MAX_JOB_DESCRIPTION_IMAGE_BYTES = 2 * 1024 * 1024;

@Controller('moderator')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('moderator', 'admin')
export class ModerationController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly subscriptions: SubscriptionsService,
    private readonly jobDescriptionMedia: JobDescriptionMediaService,
  ) {}

  private userId(req: Request): string {
    const id = req.hireforgeUser?.id;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }

  @Get('me')
  me(@Req() req: Request) {
    return this.moderation.getMe(this.userId(req));
  }

  @Post('jobs')
  createJobDraft(@Req() req: Request, @Body() body: unknown) {
    const parsed = moderatorCreateJobDraftBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.moderation.createJobDraftOnBehalf(
      this.userId(req),
      parsed.data,
    );
  }

  @Get('jobs/queue')
  queue(
    @Query('status') status: string | undefined,
    @Query('limit') limitRaw: string | undefined,
    @Query('offset') offsetRaw: string | undefined,
  ) {
    const parsed = moderatorJobQueueQuerySchema.safeParse({
      status: status?.trim() || undefined,
      limit: limitRaw,
      offset: offsetRaw,
    });
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid query',
        z.flattenError(parsed.error),
      );
    }
    const q = parsed.data;
    return this.moderation.listQueue({
      status: q.status ?? 'submitted',
      limit: q.limit,
      offset: q.offset,
    });
  }

  @Get('subscriptions/pending-payment')
  listPendingSubscriptionPayments(@Req() req: Request) {
    return this.subscriptions.listPendingPaymentForModerator(this.userId(req));
  }

  @Get('jobs/:id/authoring')
  getJobAuthoring(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.moderation.getJobForAuthoring(id);
  }

  @Get('jobs/:id')
  getJob(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.moderation.getJob(id);
  }

  @Get('companies/:companyId/job-composer-bootstrap')
  jobComposerBootstrap(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    return this.moderation.getCompanyJobComposerBootstrap(companyId);
  }

  @Patch('jobs/:id')
  patchJob(
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
    return this.moderation.patchJobBody(this.userId(req), id, parsed.data);
  }

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
    return this.jobDescriptionMedia.uploadAsModerator(
      this.userId(req),
      id,
      file,
    );
  }

  @Post('jobs/:id/publish')
  publish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.moderation.publishJob(id);
  }

  @Post('jobs/:id/publish-directly')
  publishDirectly(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.moderation.publishJobDirectly(this.userId(req), id);
  }

  @Post('jobs/:id/reject')
  reject(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: unknown) {
    const parsed = moderatorRejectBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.moderation.rejectJob(id, parsed.data.reason);
  }

  @Post('jobs/:id/unpublish')
  unpublish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.moderation.unpublishJob(id);
  }

  @Post('subscriptions/:id/mark-paid')
  markSubscriptionPaid(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const role = req.hireforgeUser?.role;
    if (role !== 'moderator' && role !== 'admin') {
      throw new UnauthorizedException();
    }
    const parsed = moderatorMarkSubscriptionPaidBodySchema.safeParse(
      body ?? {},
    );
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.subscriptions.markPaidByModeratorOrAdmin(
      { id: this.userId(req), role },
      id,
    );
  }
}
