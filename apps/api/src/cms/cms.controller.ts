import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';

import { CmsService } from './cms.service';

@Controller('cms')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Post('sync/package')
  @HttpCode(200)
  syncPackage(
    @Body() body: unknown,
    @Headers('x-cms-sync-secret') secret: string | undefined,
  ) {
    return this.cms.syncPackage(body, secret);
  }
}
