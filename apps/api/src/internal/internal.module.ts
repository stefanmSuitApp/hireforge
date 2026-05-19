import { Module } from '@nestjs/common';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { RolesGuard } from '../auth/roles.guard';
import { InternalController } from './internal.controller';

@Module({
  controllers: [InternalController],
  providers: [AuthenticatedGuard, RolesGuard],
})
export class InternalModule {}
