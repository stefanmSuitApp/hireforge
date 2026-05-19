import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  staffEmployerListQuerySchema,
  staffEmployerPatchBodySchema,
} from 'contracts';
import type { Request } from 'express';
import { z } from 'zod';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { codedBadRequest } from '../http/coded-http';
import { firstQueryString } from '../http/query-string';
import { StaffEmployersService } from './staff-employers.service';

@Controller('moderator/employers')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('moderator', 'admin')
export class StaffEmployersController {
  constructor(private readonly employers: StaffEmployersService) {}

  private userId(req: Request): string {
    const id = req.hireforgeUser?.id;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }

  @Get()
  list(@Req() req: Request) {
    const q = firstQueryString(req.query['q']);
    const limitRaw = firstQueryString(req.query['limit']);
    const offsetRaw = firstQueryString(req.query['offset']);
    const parsed = staffEmployerListQuerySchema.safeParse({
      q: q?.trim() || undefined,
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
    return this.employers.list(parsed.data);
  }

  @Patch(':employerId')
  patch(
    @Req() req: Request,
    @Param('employerId', new ParseUUIDPipe()) employerId: string,
    @Body() body: unknown,
  ) {
    const parsed = staffEmployerPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.employers.patch(this.userId(req), employerId, parsed.data);
  }
}
