import {
  Body,
  Controller,
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
  staffCompanyCloseLostBodySchema,
  staffCompanyCreateBodySchema,
  staffCompanyListQuerySchema,
  staffCompanyPatchBodySchema,
} from 'contracts';
import type { Request } from 'express';
import { z } from 'zod';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { codedBadRequest } from '../http/coded-http';
import { firstQueryString } from '../http/query-string';
import { StaffCompaniesService } from './staff-companies.service';

@Controller('moderator/companies')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('moderator', 'admin')
export class StaffCompaniesController {
  constructor(private readonly companies: StaffCompaniesService) {}

  private userId(req: Request): string {
    const id = req.hireforgeUser?.id;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }

  private role(req: Request) {
    const r = req.hireforgeUser?.role;
    if (!r) {
      throw new UnauthorizedException();
    }
    return r;
  }

  @Get()
  list(@Req() req: Request) {
    const q = firstQueryString(req.query['q']);
    const viewRaw = firstQueryString(req.query['view']);
    const limitRaw = firstQueryString(req.query['limit']);
    const offsetRaw = firstQueryString(req.query['offset']);
    const parsed = staffCompanyListQuerySchema.safeParse({
      q: q?.trim() || undefined,
      view: viewRaw?.trim() || undefined,
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
    return this.companies.list(parsed.data, {
      actorUserId: this.userId(req),
      actorRole: this.role(req),
    });
  }

  @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.getById(id);
  }

  @Post()
  create(@Req() req: Request, @Body() body: unknown) {
    const parsed = staffCompanyCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.companies.create(this.userId(req), parsed.data);
  }

  @Post(':id/pickup')
  pickup(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.pickup(this.userId(req), id);
  }

  @Post(':id/close-won')
  closeWon(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.companies.closeWon(this.userId(req), id);
  }

  @Post(':id/close-lost')
  closeLost(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = staffCompanyCloseLostBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.companies.closeLost(this.userId(req), id, parsed.data);
  }

  @Patch(':id')
  patch(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = staffCompanyPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.companies.patch(
      this.userId(req),
      this.role(req),
      id,
      parsed.data,
    );
  }
}
