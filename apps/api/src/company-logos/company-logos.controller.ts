import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { StaffActor } from '../staff/staff-company-access';
import {
  CompanyLogosService,
  MAX_COMPANY_LOGO_BYTES,
} from './company-logos.service';

@Controller('moderator/companies')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('moderator', 'admin')
export class CompanyLogosStaffController {
  constructor(private readonly logos: CompanyLogosService) {}

  private actor(req: Request): StaffActor {
    const user = req.hireforgeUser;
    if (!user?.id || !user.role) {
      throw new UnauthorizedException();
    }
    return { actorUserId: user.id, actorRole: user.role };
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_COMPANY_LOGO_BYTES },
    }),
  )
  upload(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.logos.upload(this.actor(req), id, file as Express.Multer.File);
  }

  @Delete(':id/logo')
  remove(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.logos.remove(this.actor(req), id);
  }
}

@Controller('public/company-logos')
export class CompanyLogosPublicController {
  constructor(private readonly logos: CompanyLogosService) {}

  @Get()
  map() {
    return this.logos.publicMap();
  }

  @Get(':companyId')
  async image(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.logos.publicImage(companyId);
    // Links carry ?v=<upload time>, so each version can be cached for good.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', 'image/webp');
    res.end(buffer);
  }
}
