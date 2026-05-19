import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { JobDescriptionMediaService } from './job-description-media.service';

@Controller('public/job-description-media')
export class JobDescriptionMediaPublicController {
  constructor(private readonly media: JobDescriptionMediaService) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const file = await this.media.getPublicFile(id);
    if (!file) {
      throw new NotFoundException();
    }
    res.setHeader('Content-Type', file.mimeType);
    res.end(file.buffer);
  }
}
