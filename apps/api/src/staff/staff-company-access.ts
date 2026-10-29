import type { UserRole } from 'contracts';
import { eq, inArray, or, type SQL } from 'drizzle-orm';
import { companies } from 'database';

import {
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';

export type StaffActor = { actorUserId: string; actorRole: UserRole };

/** The lead pool: companies any moderator may work. */
const LEAD_POOL = ['unassigned', 'closed_lost'] as const;

/**
 * Moderators work their own companies plus the lead pool (`unassigned`,
 * `closed_lost`); admins see everything. PRODUCT_SSOT §11.
 */
export function staffCanAccessCompany(
  company: { assignedModeratorId: string | null; salesStatus: string },
  actor: StaffActor,
): boolean {
  if (actor.actorRole === 'admin') {
    return true;
  }
  return (
    company.assignedModeratorId === actor.actorUserId ||
    (LEAD_POOL as readonly string[]).includes(company.salesStatus)
  );
}

/** The same rule as a filter on `companies` (undefined = no filter, admins). */
export function staffCompanyScope(actor: StaffActor): SQL | undefined {
  if (actor.actorRole === 'admin') {
    return undefined;
  }
  return or(
    eq(companies.assignedModeratorId, actor.actorUserId),
    inArray(companies.salesStatus, [...LEAD_POOL]),
  );
}

/** 404 for an unknown company, 403 for one outside the actor's scope. */
export async function assertStaffCanAccessCompany(
  companyId: string,
  actor: StaffActor,
): Promise<void> {
  const database = getDb();
  if (!database) {
    throw codedServiceUnavailable(
      'DATABASE_UNAVAILABLE',
      'Database is not configured (DATABASE_URL)',
    );
  }
  const [company] = await database.db
    .select({
      assignedModeratorId: companies.assignedModeratorId,
      salesStatus: companies.salesStatus,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) {
    throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
  }
  if (!staffCanAccessCompany(company, actor)) {
    throw codedForbidden(
      'STAFF_COMPANY_VIEW_FORBIDDEN',
      'You can only work on your companies or unassigned / closed-lost leads',
    );
  }
}
