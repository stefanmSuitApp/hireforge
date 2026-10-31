import { Injectable } from '@nestjs/common';
import type {
  StaffAccountInviteResponse,
  StaffCompanyAccountCreateBody,
} from 'contracts';
import { and, eq } from 'drizzle-orm';
import { companies, employers, users } from 'database';
import type { EmailLocale } from 'server-email';

import { AuthEmailService } from '../auth/auth-email.service';
import {
  codedConflict,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { StaffAuditService } from './staff-audit.service';
import {
  assertStaffCanAccessCompany,
  type StaffActor,
} from './staff-company-access';

/**
 * Employer accounts that staff open for a company. The account is linked at
 * once (staff vouch for it, unlike a self-signup match) and has no password
 * until the person follows the invite link.
 */
@Injectable()
export class StaffAccountsService {
  constructor(
    private readonly audit: StaffAuditService,
    private readonly authEmail: AuthEmailService,
  ) {}

  private requireDb() {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    return database;
  }

  private async companyName(companyId: string): Promise<string> {
    const { db } = this.requireDb();
    const [company] = await db
      .select({ legalName: companies.legalName })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (!company) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }
    return company.legalName;
  }

  async create(
    actor: StaffActor,
    companyId: string,
    body: StaffCompanyAccountCreateBody,
  ): Promise<StaffAccountInviteResponse> {
    await assertStaffCanAccessCompany(companyId, actor);
    const companyName = await this.companyName(companyId);
    const { db } = this.requireDb();
    const email = body.email.trim().toLowerCase();

    const emailTaken = () =>
      codedConflict(
        'STAFF_ACCOUNT_EMAIL_TAKEN',
        'An account with this email already exists',
      );

    let userId: string;
    try {
      userId = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (existing) {
          throw emailTaken();
        }
        const [user] = await tx
          .insert(users)
          .values({ email, role: 'employer' })
          .returning({ id: users.id });
        await tx.insert(employers).values({ userId: user.id, companyId });
        return user.id;
      });
    } catch (e: unknown) {
      // Two staff adding the same email at once: the unique index decides.
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === '23505'
      ) {
        throw emailTaken();
      }
      throw e;
    }

    await this.audit.log({
      actorUserId: actor.actorUserId,
      action: 'employer_account.invite',
      entityType: 'company',
      entityId: companyId,
      metadata: { userId, email },
    });

    const invite = await this.authEmail.sendAccountInvite({
      userId,
      email,
      companyName,
      locale: body.locale as EmailLocale,
    });
    return { userId, ...invite };
  }

  /** A new link for an account that was never activated; the old one stops working. */
  async resendInvite(
    actor: StaffActor,
    companyId: string,
    userId: string,
    locale: EmailLocale,
  ): Promise<StaffAccountInviteResponse> {
    await assertStaffCanAccessCompany(companyId, actor);
    const companyName = await this.companyName(companyId);
    const { db } = this.requireDb();

    const [member] = await db
      .select({ email: users.email, passwordHash: users.passwordHash })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .where(
        and(eq(employers.companyId, companyId), eq(employers.userId, userId)),
      )
      .limit(1);
    if (!member) {
      throw codedNotFound(
        'EMPLOYER_NOT_FOUND',
        'No such account in this company',
      );
    }
    if (member.passwordHash) {
      throw codedConflict(
        'ACCOUNT_ALREADY_ACTIVE',
        'This account already has a password',
      );
    }

    await this.audit.log({
      actorUserId: actor.actorUserId,
      action: 'employer_account.invite_resend',
      entityType: 'company',
      entityId: companyId,
      metadata: { userId, email: member.email },
    });

    const invite = await this.authEmail.sendAccountInvite({
      userId,
      email: member.email,
      companyName,
      locale,
    });
    return { userId, ...invite };
  }
}
