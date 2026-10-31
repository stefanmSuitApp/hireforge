import { Injectable } from '@nestjs/common';
import {
  selfSignupCompanyInputSchema,
  type StaffCompanyJoinRequestListResponse,
  type UserRole,
} from 'contracts';
import { and, asc, eq, inArray, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  companies,
  companyJoinRequests,
  type DrizzleTransaction,
  employers,
  outboxEvents,
  users,
} from 'database';
import {
  mergeCompanyRowFromSelfSignup,
  type SelfSignupCompanyInput,
} from 'server-employers';

import {
  codedConflict,
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { getCorrelationId } from '../observability/correlation-storage';
import { StaffAuditService } from './staff-audit.service';
import { staffCanAccessCompany } from './staff-company-access';

type Actor = { actorUserId: string; actorRole: UserRole };

/** Unique per company: a value another company took since the sign-up is skipped. */
const UNIQUE_IDENTIFIERS = ['pib', 'mb', 'vatId'] as const;

function parseCompanyInput(raw: unknown): SelfSignupCompanyInput | null {
  const parsed = selfSignupCompanyInputSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

@Injectable()
export class StaffJoinRequestsService {
  constructor(private readonly audit: StaffAuditService) {}

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

  /** Pending requests the actor may decide (own companies + lead pool; admin: all). */
  async listPending(
    actor: Actor,
  ): Promise<StaffCompanyJoinRequestListResponse> {
    const { db } = this.requireDb();
    const requester = alias(users, 'join_requester');
    const moderator = alias(users, 'join_company_mod');

    const scope =
      actor.actorRole === 'admin'
        ? undefined
        : or(
            eq(companies.assignedModeratorId, actor.actorUserId),
            inArray(companies.salesStatus, ['unassigned', 'closed_lost']),
          );

    const rows = await db
      .select({
        id: companyJoinRequests.id,
        userEmail: requester.email,
        companyId: companies.id,
        companyLegalName: companies.legalName,
        companyPib: companies.pib,
        assignedModeratorEmail: moderator.email,
        createdAt: companyJoinRequests.createdAt,
        companyInput: companyJoinRequests.companyInput,
      })
      .from(companyJoinRequests)
      .innerJoin(requester, eq(companyJoinRequests.userId, requester.id))
      .innerJoin(companies, eq(companyJoinRequests.companyId, companies.id))
      .leftJoin(moderator, eq(companies.assignedModeratorId, moderator.id))
      .where(and(eq(companyJoinRequests.status, 'pending'), scope))
      .orderBy(asc(companyJoinRequests.createdAt))
      .limit(200);

    return {
      items: rows.map(({ companyInput, ...r }) => {
        const input = parseCompanyInput(companyInput);
        return {
          ...r,
          companyPib: r.companyPib ?? null,
          assignedModeratorEmail: r.assignedModeratorEmail ?? null,
          createdAt: r.createdAt.toISOString(),
          submitted: input
            ? {
                legalName: input.legalName,
                pib: input.pib ?? null,
                mb: input.mb ?? null,
                vatId: input.vatId ?? null,
                taxId: input.taxId ?? null,
              }
            : null,
        };
      }),
    };
  }

  async decide(
    requestId: string,
    decision: 'approved' | 'rejected',
    actor: Actor,
  ): Promise<{ id: string; status: 'approved' | 'rejected' }> {
    const { db } = this.requireDb();

    const decided = await db.transaction(async (tx) => {
      // Row lock: two staff clicking at once cannot both decide.
      const [request] = await tx
        .select({
          id: companyJoinRequests.id,
          userId: companyJoinRequests.userId,
          companyId: companyJoinRequests.companyId,
          status: companyJoinRequests.status,
          companyInput: companyJoinRequests.companyInput,
        })
        .from(companyJoinRequests)
        .where(eq(companyJoinRequests.id, requestId))
        .for('update')
        .limit(1);
      if (!request) {
        throw codedNotFound(
          'COMPANY_JOIN_REQUEST_NOT_FOUND',
          'Join request not found',
        );
      }

      const [company] = await tx
        .select({
          assignedModeratorId: companies.assignedModeratorId,
          salesStatus: companies.salesStatus,
        })
        .from(companies)
        .where(eq(companies.id, request.companyId))
        .limit(1);
      if (!company || !staffCanAccessCompany(company, actor)) {
        throw codedForbidden(
          'COMPANY_JOIN_REQUEST_FORBIDDEN',
          'You can only decide requests for your companies or the lead pool',
        );
      }
      if (request.status !== 'pending') {
        throw codedConflict(
          'COMPANY_JOIN_REQUEST_NOT_PENDING',
          'This join request has already been decided',
        );
      }

      await tx
        .update(companyJoinRequests)
        .set({
          status: decision,
          decidedByUserId: actor.actorUserId,
          decidedAt: new Date(),
        })
        .where(eq(companyJoinRequests.id, request.id));

      let filled: string[] = [];
      if (decision === 'approved') {
        await tx
          .insert(employers)
          .values({ userId: request.userId, companyId: request.companyId })
          .onConflictDoNothing();
        filled = await this.fillEmptyCompanyFields(
          tx,
          request.companyId,
          request.companyInput,
        );
      }
      // Worker emails the requester (notification-email job).
      await tx.insert(outboxEvents).values({
        eventType: 'company_join_request_decided',
        correlationId: getCorrelationId() ?? null,
        payload: {
          joinRequestId: request.id,
          companyId: request.companyId,
          decision,
        },
      });
      return { ...request, filled };
    });

    await this.audit.log({
      actorUserId: actor.actorUserId,
      action:
        decision === 'approved'
          ? 'company_join_request.approve'
          : 'company_join_request.reject',
      entityType: 'company',
      entityId: decided.companyId,
      metadata: {
        joinRequestId: decided.id,
        userId: decided.userId,
        ...(decided.filled.length ? { filledFields: decided.filled } : {}),
      },
    });

    return { id: decided.id, status: decision };
  }

  /**
   * Staff may have added the company by name only; the person who signed up
   * entered its PIB, MB, address and billing contact. Fill only what is
   * still empty: never overwrite what staff entered.
   */
  private async fillEmptyCompanyFields(
    tx: DrizzleTransaction,
    companyId: string,
    rawInput: unknown,
  ): Promise<string[]> {
    const input = parseCompanyInput(rawInput);
    if (!input) {
      return [];
    }
    const [existing] = await tx
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .for('update')
      .limit(1);
    if (!existing) {
      return [];
    }
    const patch = mergeCompanyRowFromSelfSignup(existing, input);
    for (const key of UNIQUE_IDENTIFIERS) {
      const value = patch[key];
      if (!value) continue;
      const [taken] = await tx
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies[key], value), ne(companies.id, companyId)))
        .limit(1);
      if (taken) {
        delete patch[key];
      }
    }
    const filled = Object.keys(patch);
    if (filled.length) {
      await tx
        .update(companies)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(companies.id, companyId));
    }
    return filled;
  }
}
