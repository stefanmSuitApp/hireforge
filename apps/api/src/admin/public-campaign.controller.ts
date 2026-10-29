import { Controller, Get } from '@nestjs/common';
import type { PublicCampaignResponse } from 'contracts';

import { AdminCampaignsService } from './admin-campaigns.service';

/** The running public campaign for the home banner and packages page. No code. */
@Controller('public/campaign')
export class PublicCampaignController {
  constructor(private readonly campaigns: AdminCampaignsService) {}

  @Get()
  async current(): Promise<PublicCampaignResponse> {
    return { campaign: await this.campaigns.running() };
  }
}
