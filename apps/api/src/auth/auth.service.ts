import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { EmployerSelfSignupBody } from 'contracts';
import {
  candidates,
  companies,
  companyJoinRequests,
  employers,
  users,
} from 'database';
import {
  findExistingCompanyIdForSelfSignup,
  newCompanyValuesFromSelfSignup,
} from 'server-employers';

import {
  codedBadRequest,
  codedConflict,
  codedInternalError,
  codedServiceUnavailable,
  codedUnauthorized,
} from '../http/coded-http';
import { getDb } from '../database';
import { hashPassword, verifyPassword } from './password';
import { AuthEmailService } from './auth-email.service';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt';

function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (base || 'company').slice(0, 80);
}

function assertSlugFormat(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw codedBadRequest(
      'AUTH_COMPANY_SLUG_FORMAT',
      'companySlug must be lowercase letters, digits, and hyphens only',
    );
  }
}

@Injectable()
export class AuthService {
  constructor(private readonly authEmail: AuthEmailService) {}

  async registerEmployer(
    input: EmployerSelfSignupBody,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);
    const companyPayload = input.company;

    const created = await database.db.transaction(async (tx) => {
      const existingUser = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser[0]) {
        throw codedConflict(
          'AUTH_EMAIL_EXISTS',
          'An account with this email already exists',
        );
      }

      const existingCompanyId = await findExistingCompanyIdForSelfSignup(
        tx,
        companyPayload,
      );

      let companyId: string;

      if (existingCompanyId) {
        // PIB / MB / VAT IDs are public, so a match proves nothing about the
        // signer: never link or merge into the existing company here. A
        // pending join request is created below for staff to approve.
        companyId = existingCompanyId;
      } else {
        const baseSlug = input.companySlug?.trim()
          ? slugify(input.companySlug)
          : slugify(companyPayload.legalName);
        if (input.companySlug?.trim()) {
          assertSlugFormat(baseSlug);
        }
        let slug = baseSlug;
        for (let i = 0; i < 24; i++) {
          const clash = await tx
            .select({ id: companies.id })
            .from(companies)
            .where(eq(companies.slug, slug))
            .limit(1);
          if (!clash[0]) {
            break;
          }
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
          if (slug.length > 80) {
            slug = slug.slice(0, 80).replace(/-+$/g, '');
          }
        }
        const taken = await tx
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.slug, slug))
          .limit(1);
        if (taken[0]) {
          throw codedConflict(
            'AUTH_COMPANY_SLUG_TAKEN',
            'Could not allocate a unique company slug',
          );
        }
        const companyValues = newCompanyValuesFromSelfSignup(
          companyPayload,
          slug,
        );
        const [created] = await tx
          .insert(companies)
          .values(companyValues)
          .returning({ id: companies.id });
        if (!created) {
          throw codedInternalError('INTERNAL_ERROR', 'Company creation failed');
        }
        companyId = created.id;
      }

      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          role: 'employer',
        })
        .returning({ id: users.id, role: users.role });

      const existingEmployer = await tx
        .select({ id: employers.id })
        .from(employers)
        .where(eq(employers.userId, user.id))
        .limit(1);
      if (existingEmployer[0]) {
        throw codedConflict(
          'EMPLOYER_ALREADY_LINKED',
          'User is already linked to a company; multi-company support is P2.',
        );
      }

      if (existingCompanyId) {
        await tx.insert(companyJoinRequests).values({
          userId: user.id,
          companyId,
        });
      } else {
        await tx.insert(employers).values({
          userId: user.id,
          companyId,
        });
      }

      const accessToken = await signAccessToken(user.id, user.role);
      const refreshToken = await signRefreshToken(user.id);
      return { userId: user.id, accessToken, refreshToken };
    });

    await this.authEmail.sendVerificationAfterSignup(
      created.userId,
      email,
      input.locale ?? 'sr',
    );
    return {
      accessToken: created.accessToken,
      refreshToken: created.refreshToken,
    };
  }

  async registerCandidate(input: {
    email: string;
    password: string;
    fullName?: string;
    locale?: 'sr' | 'en';
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);
    const fullName = input.fullName?.trim() || null;

    const created = await database.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing[0]) {
        throw codedConflict(
          'AUTH_EMAIL_EXISTS',
          'An account with this email already exists',
        );
      }

      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          role: 'candidate',
        })
        .returning({ id: users.id, role: users.role });

      await tx.insert(candidates).values({
        userId: user.id,
        fullName,
      });

      const accessToken = await signAccessToken(user.id, user.role);
      const refreshToken = await signRefreshToken(user.id);
      return { userId: user.id, accessToken, refreshToken };
    });

    await this.authEmail.sendVerificationAfterSignup(
      created.userId,
      email,
      input.locale ?? 'sr',
    );
    return {
      accessToken: created.accessToken,
      refreshToken: created.refreshToken,
    };
  }

  async loginCandidate(input: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const email = input.email.trim().toLowerCase();
    const rows = await database.db
      .select({
        id: users.id,
        role: users.role,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(and(eq(users.email, email), eq(users.role, 'candidate')))
      .limit(1);
    const row = rows[0];
    if (
      !row ||
      !(await verifyPassword(input.password, row.passwordHash ?? null))
    ) {
      throw codedUnauthorized(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }
    const accessToken = await signAccessToken(row.id, row.role);
    const refreshToken = await signRefreshToken(row.id);
    return { accessToken, refreshToken };
  }

  async loginEmployer(input: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const email = input.email.trim().toLowerCase();
    const rows = await database.db
      .select({
        id: users.id,
        role: users.role,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(and(eq(users.email, email), eq(users.role, 'employer')))
      .limit(1);
    const row = rows[0];
    if (
      !row ||
      !(await verifyPassword(input.password, row.passwordHash ?? null))
    ) {
      throw codedUnauthorized(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }
    const accessToken = await signAccessToken(row.id, row.role);
    const refreshToken = await signRefreshToken(row.id);
    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    let sub: string;
    try {
      ({ sub } = await verifyRefreshToken(refreshToken));
    } catch {
      throw codedUnauthorized('AUTH_REFRESH_INVALID', 'Invalid refresh token');
    }
    const rows = await database.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, sub))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw codedUnauthorized('AUTH_USER_REMOVED', 'User no longer exists');
    }
    return {
      accessToken: await signAccessToken(row.id, row.role),
      refreshToken: await signRefreshToken(row.id),
    };
  }

  /** Moderator / admin backoffice login (not employer or candidate). */
  async loginStaff(input: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const email = input.email.trim().toLowerCase();
    const rows = await database.db
      .select({
        id: users.id,
        role: users.role,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          inArray(users.role, ['moderator', 'admin']),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (
      !row ||
      !(await verifyPassword(input.password, row.passwordHash ?? null))
    ) {
      throw codedUnauthorized(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }
    const accessToken = await signAccessToken(row.id, row.role);
    const refreshToken = await signRefreshToken(row.id);
    return { accessToken, refreshToken };
  }
}
