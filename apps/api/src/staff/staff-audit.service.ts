import { Injectable } from '@nestjs/common';
import { staffAuditLog } from 'database';

import { getDb } from '../database';

@Injectable()
export class StaffAuditService {
  async log(input: {
    /** Omit for automated actors (CMS webhook, worker reconcile). */
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const database = getDb();
    if (!database) {
      return;
    }
    await database.db.insert(staffAuditLog).values({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? null,
    });
  }
}
