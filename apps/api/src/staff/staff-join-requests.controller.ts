import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StaffJoinRequestsService } from './staff-join-requests.service';

@Controller('moderator/company-join-requests')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('moderator', 'admin')
export class StaffJoinRequestsController {
  constructor(private readonly joinRequests: StaffJoinRequestsService) {}

  private actor(req: Request) {
    const user = req.hireforgeUser;
    if (!user) {
      throw new UnauthorizedException();
    }
    return { actorUserId: user.id, actorRole: user.role };
  }

  @Get()
  list(@Req() req: Request) {
    return this.joinRequests.listPending(this.actor(req));
  }

  @Post(':id/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.joinRequests.decide(id, 'approved', this.actor(req));
  }

  @Post(':id/reject')
  reject(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.joinRequests.decide(id, 'rejected', this.actor(req));
  }
}
