import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.hireforgeUser) {
      throw new UnauthorizedException(
        'Authentication required: send Authorization: Bearer <access token>, or enable AUTH_DEV_HEADERS=1 with X-Hireforge-Dev-User-Id (seeded user uuid).',
      );
    }
    return true;
  }
}
