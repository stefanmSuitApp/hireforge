import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('internal')
@UseGuards(AuthenticatedGuard)
export class InternalController {
  @Get('whoami')
  whoami(@Req() req: Request) {
    return { user: req.hireforgeUser };
  }

  @Get('admin/ping')
  @UseGuards(RolesGuard)
  @Roles('admin')
  adminPing() {
    return { ok: true as const, scope: 'admin' };
  }
}
