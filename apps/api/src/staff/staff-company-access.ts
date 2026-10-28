import type { UserRole } from 'contracts';

/**
 * Moderators work their own companies plus the lead pool (`unassigned`,
 * `closed_lost`); admins see everything. PRODUCT_SSOT §11.
 */
export function staffCanAccessCompany(
  company: { assignedModeratorId: string | null; salesStatus: string },
  actor: { actorUserId: string; actorRole: UserRole },
): boolean {
  if (actor.actorRole === 'admin') {
    return true;
  }
  return (
    company.assignedModeratorId === actor.actorUserId ||
    company.salesStatus === 'unassigned' ||
    company.salesStatus === 'closed_lost'
  );
}
