import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  adminAuditListQuerySchema,
  adminCompanyReassignBodySchema,
  adminJobCategoryCreateBodySchema,
  adminJobCategoryPatchBodySchema,
  adminJobPatchPublishBodySchema,
  adminPromoCodesListQuerySchema,
  adminSubscriptionCancelBodySchema,
  adminSubscriptionMaxActiveJobsPatchBodySchema,
  adminUserListQuerySchema,
  adminUserPatchBodySchema,
  promoCodeCreateBodySchema,
  promoCodePatchBodySchema,
} from 'contracts';
import type { Request } from 'express';
import { z } from 'zod';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { codedBadRequest } from '../http/coded-http';
import { firstQueryString } from '../http/query-string';
import { AdminPromoCodesService } from './admin-promo-codes.service';
import { AdminService } from './admin.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('admin')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly subscriptions: SubscriptionsService,
    private readonly promoCodes: AdminPromoCodesService,
  ) {}

  private userId(req: Request): string {
    const id = req.hireforgeUser?.id;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }

  @Get('promo-codes')
  listPromoCodes(@Req() req: Request) {
    void this.userId(req);
    const limitRaw = firstQueryString(req.query['limit']);
    const offsetRaw = firstQueryString(req.query['offset']);
    const parsed = adminPromoCodesListQuerySchema.safeParse({
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
    return this.promoCodes.list(parsed.data);
  }

  @Post('promo-codes')
  createPromoCode(@Req() req: Request, @Body() body: unknown) {
    const parsed = promoCodeCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.promoCodes.create(this.userId(req), parsed.data);
  }

  @Patch('promo-codes/:id')
  patchPromoCode(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = promoCodePatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.promoCodes.patch(this.userId(req), id, parsed.data);
  }

  @Get('companies/:id/assignment-history')
  companyAssignmentHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.listCompanyAssignmentHistory(id);
  }

  @Post('companies/:id/reassign')
  reassignCompany(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = adminCompanyReassignBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.admin.reassignCompany(this.userId(req), id, parsed.data);
  }

  @Get('users')
  listUsers(@Req() req: Request) {
    const role = firstQueryString(req.query['role']);
    const limitRaw = firstQueryString(req.query['limit']);
    const offsetRaw = firstQueryString(req.query['offset']);
    const parsed = adminUserListQuerySchema.safeParse({
      role: role?.trim() || undefined,
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
    return this.admin.listUsers(parsed.data);
  }

  @Patch('users/:id')
  patchUser(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = adminUserPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.admin.patchUser(this.userId(req), id, parsed.data);
  }

  @Get('job-categories')
  listCategories() {
    return this.admin.listJobCategories();
  }

  @Post('job-categories')
  createCategory(@Req() req: Request, @Body() body: unknown) {
    const parsed = adminJobCategoryCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.admin.createJobCategory(this.userId(req), parsed.data);
  }

  @Patch('job-categories/:id')
  patchCategory(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = adminJobCategoryPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.admin.patchJobCategory(this.userId(req), id, parsed.data);
  }

  @Delete('job-categories/:id')
  deleteCategory(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.admin.deleteJobCategory(this.userId(req), id);
  }

  @Get('audit')
  listAudit(@Req() req: Request) {
    const limitRaw = firstQueryString(req.query['limit']);
    const offsetRaw = firstQueryString(req.query['offset']);
    const parsed = adminAuditListQuerySchema.safeParse({
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
    return this.admin.listAudit(parsed.data);
  }

  @Post('jobs/:id/publish-directly')
  publishJobDirectly(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.admin.publishEnterpriseJobDirectly(this.userId(req), id);
  }

  @Post('jobs/:id/patch-publish')
  patchPublish(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = adminJobPatchPublishBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.admin.patchPublishPublishedJob(
      this.userId(req),
      id,
      parsed.data,
    );
  }

  @Post('jobs/:id/force-archive')
  forceArchive(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.admin.forceArchiveJob(this.userId(req), id);
  }

  @Get('subscriptions/pending-enterprise')
  listPendingEnterpriseActivations(@Req() req: Request) {
    void this.userId(req);
    return this.subscriptions.listPendingEnterpriseActivations();
  }

  @Post('subscriptions/:id/activate')
  activateSubscription(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.subscriptions.activateEnterpriseByAdmin(this.userId(req), id);
  }

  @Patch('subscriptions/:id/max-active-jobs')
  patchSubscriptionMaxActiveJobs(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed =
      adminSubscriptionMaxActiveJobsPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.subscriptions.patchMaxActiveJobsOverrideByAdmin(
      this.userId(req),
      id,
      parsed.data.maxActiveJobsOverride,
    );
  }

  @Post('subscriptions/:id/cancel')
  cancelSubscription(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = adminSubscriptionCancelBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.subscriptions.cancelByAdmin(this.userId(req), id);
  }
}
