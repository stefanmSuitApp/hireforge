import { Injectable } from '@nestjs/common';
import type { StaffCompanyJoinRequestListResponse, UserRole } from 'contracts';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { companies, companyJoinRequests, employers, users } from 'database';

import {
  codedConflict,
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { StaffAuditService } from './staff-audit.service';
import { staffCanAccessCompany } from './staff-company-access';

type Actor = { actorUserId: string; actorRole: UserRole };

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
      })
      .from(companyJoinRequests)
      .innerJoin(requester, eq(companyJoinRequests.userId, requester.id))
      .innerJoin(companies, eq(companyJoinRequests.companyId, companies.id))
      .leftJoin(moderator, eq(companies.assignedModeratorId, moderator.id))
      .where(and(eq(companyJoinRequests.status, 'pending'), scope))
      .orderBy(asc(companyJoinRequests.createdAt))
      .limit(200);

    return {
      items: rows.map((r) => ({
        ...r,
        companyPib: r.companyPib ?? null,
        assignedModeratorEmail: r.assignedModeratorEmail ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
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

      if (decision === 'approved') {
        await tx
          .insert(employers)
          .values({ userId: request.userId, companyId: request.companyId })
          .onConflictDoNothing();
      }
      return request;
    });

    await this.audit.log({
      actorUserId: actor.actorUserId,
      action:
        decision === 'approved'
          ? 'company_join_request.approve'
          : 'company_join_request.reject',
      entityType: 'company',
      entityId: decided.companyId,
      metadata: { joinRequestId: decided.id, userId: decided.userId },
    });

    return { id: decided.id, status: decision };
  }
}
