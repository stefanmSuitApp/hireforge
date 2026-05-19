import { Injectable } from '@nestjs/common';
import type { StaffEmployerListItem, StaffEmployerPatchBody } from 'contracts';
import { count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { companies, employers, users } from 'database';

import { codedNotFound, codedServiceUnavailable } from '../http/coded-http';
import { getDb } from '../database';
import { StaffAuditService } from './staff-audit.service';

@Injectable()
export class StaffEmployersService {
  constructor(private readonly audit: StaffAuditService) {}

  async list(input: {
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: StaffEmployerListItem[]; total: number }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const q = input.q?.trim();
    const whereExpr = q
      ? or(
          ilike(users.email, `%${q}%`),
          ilike(companies.legalName, `%${q}%`),
          ilike(companies.slug, `%${q}%`),
        )
      : undefined;

    const [totalRow] = await database.db
      .select({ n: count() })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .innerJoin(companies, eq(employers.companyId, companies.id))
      .where(whereExpr ?? sql`true`);

    const rows = await database.db
      .select({
        employerId: employers.id,
        userId: employers.userId,
        email: users.email,
        companyId: companies.id,
        companySlug: companies.slug,
        companyLegalName: companies.legalName,
      })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .innerJoin(companies, eq(employers.companyId, companies.id))
      .where(whereExpr ?? sql`true`)
      .orderBy(desc(employers.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const items: StaffEmployerListItem[] = rows.map((r) => ({
      employerId: r.employerId,
      userId: r.userId,
      email: r.email,
      companyId: r.companyId,
      companySlug: r.companySlug,
      companyLegalName: r.companyLegalName,
    }));

    return { items, total: Number(totalRow?.n ?? 0) };
  }

  async patch(
    actorUserId: string,
    employerId: string,
    body: StaffEmployerPatchBody,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [emp] = await database.db
      .select({
        id: employers.id,
        userId: employers.userId,
        companyId: employers.companyId,
      })
      .from(employers)
      .where(eq(employers.id, employerId))
      .limit(1);

    if (!emp) {
      throw codedNotFound(
        'EMPLOYER_NOT_FOUND',
        'Employer membership not found',
      );
    }

    const [targetCompany] = await database.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, body.companyId))
      .limit(1);

    if (!targetCompany) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    if (emp.companyId === body.companyId) {
      return { ok: true };
    }

    const now = new Date();
    await database.db
      .update(employers)
      .set({ companyId: body.companyId })
      .where(eq(employers.id, employerId));

    await this.audit.log({
      actorUserId,
      action: 'employer.reassign_company',
      entityType: 'employer',
      entityId: employerId,
      metadata: {
        userId: emp.userId,
        fromCompanyId: emp.companyId,
        toCompanyId: body.companyId,
        at: now.toISOString(),
      },
    });

    return { ok: true };
  }
}
