import type { UserRole } from './domain';

/**
 * Coarse capabilities for documentation and future checks.
 * Nest: combine `RolesGuard` with route-level `@Roles(...)` first; expand to action checks later.
 */
export const PERMISSIONS = {
  'job:moderate': ['admin', 'moderator'],
  'job:publish_any': ['admin', 'moderator'],
  'job:create_employer': ['admin', 'moderator', 'employer'],
  'application:view_employer': ['admin', 'moderator', 'employer'],
  'application:create': ['admin', 'moderator', 'candidate'],
  'user:admin': ['admin'],
  'employer:verify': ['admin', 'moderator'],
} as const satisfies Record<string, readonly UserRole[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

export function roleHasPermission(
  role: UserRole,
  permission: PermissionKey,
): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
