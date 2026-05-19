import { Controller, Get } from '@nestjs/common';

import { IntegrationService } from './integration.service';

@Controller('integration')
export class IntegrationController {
  constructor(private readonly integration: IntegrationService) {}

  @Get()
  getStatus() {
    return this.integration.getStatus();
  }
}
