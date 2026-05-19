import { SetMetadata } from '@nestjs/common';

import type { UserRole } from 'contracts';

import { ROLES_KEY } from './auth.constants';

/** Require one of these roles (after AuthenticatedGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
