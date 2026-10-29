import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { JobDescriptionMediaService } from './job-description-media.service';

@Controller('public/job-description-media')
export class JobDescriptionMediaPublicController {
  constructor(private readonly media: JobDescriptionMediaService) {}

  @Get(':id')
  async getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const file = await this.media.getPublicFile(id, req.hireforgeUser);
    if (!file) {
      throw new NotFoundException();
    }
    // An unpublished job's image (seen by its company or staff) must never
    // land in a shared cache.
    res.setHeader(
      'Cache-Control',
      file.public ? 'public, max-age=31536000, immutable' : 'private, no-store',
    );
    res.setHeader('Content-Type', file.mimeType);
    res.end(file.buffer);
  }
}
