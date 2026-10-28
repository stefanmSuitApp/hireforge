import { Module } from '@nestjs/common';

import { AuthEmailService } from './auth-email.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService],
  exports: [AuthService, AuthEmailService],
})
export class AuthModule {}
