import { eq } from 'drizzle-orm';
import type { DrizzleDb } from 'database';
import type { CmsPackageMirrorPayload } from 'contracts';
import {
  packageEntitlements,
  packagePrices,
  packages,
  staffAuditLog,
} from 'database';

/**
 * Upsert one package catalogue slice into Postgres inside a single transaction.
 * Replaces all `package_prices` and `package_entitlements` rows for the code.
 */
export async function upsertPackageMirror(
  db: DrizzleDb,
  payload: CmsPackageMirrorPayload,
): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(packages)
      .values({
        code: payload.code,
        isActive: payload.isActive,
        isEnterprise: payload.isEnterprise,
        displayOrder: payload.displayOrder ?? null,
        cmsRef: payload.cmsRef,
        titleSr: payload.titleSr ?? null,
        titleEn: payload.titleEn ?? null,
        marketingDescriptionSr: payload.marketingDescriptionSr ?? null,
        marketingDescriptionEn: payload.marketingDescriptionEn ?? null,
        upgradeMessages: payload.upgradeMessages?.length
          ? payload.upgradeMessages
          : null,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: packages.code,
        set: {
          isActive: payload.isActive,
          isEnterprise: payload.isEnterprise,
          displayOrder: payload.displayOrder ?? null,
          cmsRef: payload.cmsRef,
          titleSr: payload.titleSr ?? null,
          titleEn: payload.titleEn ?? null,
          marketingDescriptionSr: payload.marketingDescriptionSr ?? null,
          marketingDescriptionEn: payload.marketingDescriptionEn ?? null,
          upgradeMessages: payload.upgradeMessages?.length
            ? payload.upgradeMessages
            : null,
          lastSyncedAt: now,
          updatedAt: now,
        },
      });

    await tx
      .delete(packagePrices)
      .where(eq(packagePrices.packageCode, payload.code));

    if (payload.prices.length > 0) {
      await tx.insert(packagePrices).values(
        payload.prices.map((p) => ({
          packageCode: payload.code,
          durationDays: p.durationDays,
          amountMinor: p.amountMinor,
          currency: p.currency,
          cmsRef: payload.cmsRef,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    await tx
      .delete(packageEntitlements)
      .where(eq(packageEntitlements.packageCode, payload.code));

    await tx.insert(packageEntitlements).values(
      (
        Object.entries(payload.entitlements) as [
          keyof typeof payload.entitlements,
          (typeof payload.entitlements)[keyof typeof payload.entitlements],
        ][]
      ).map(([key, value]) => ({
        packageCode: payload.code,
        key,
        value,
        createdAt: now,
        updatedAt: now,
      })),
    );
  });
}

export async function upsertPackageMirrorAndAudit(
  db: DrizzleDb,
  payload: CmsPackageMirrorPayload,
  ctx: { source: 'cms_webhook' | 'cms_reconcile_job' },
): Promise<void> {
  await upsertPackageMirror(db, payload);
  await db.insert(staffAuditLog).values({
    actorUserId: null,
    action: 'cms.package_synced',
    entityType: 'package',
    entityId: payload.code,
    metadata: { actor: ctx.source, cmsRef: payload.cmsRef },
  });
}
