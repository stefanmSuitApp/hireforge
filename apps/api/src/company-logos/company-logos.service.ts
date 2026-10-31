import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import type {
  PublicCompanyLogosResponse,
  StaffCompanyLogoResponse,
} from 'contracts';
import { eq, isNotNull } from 'drizzle-orm';
import { companies } from 'database';
import sharp from 'sharp';

import {
  codedBadRequest,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { StaffAuditService } from '../staff/staff-audit.service';
import {
  assertStaffCanAccessCompany,
  type StaffActor,
} from '../staff/staff-company-access';
import { UploadStorageService } from '../storage/upload-storage.service';

export const MAX_COMPANY_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_SIZE = 256;
// SVG is left out on purpose: it can carry script.
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Versioned, so a new logo gets a new URL and caches can keep each forever. */
export function companyLogoUrl(companyId: string, updatedAt: Date): string {
  return `/api/public/company-logos/${companyId}?v=${updatedAt.getTime()}`;
}

/**
 * Logos staff upload for a company (companies don't manage their own). The
 * site shows them over Sanity's logo, which stays as a fallback.
 */
@Injectable()
export class CompanyLogosService {
  private readonly logger = new Logger(CompanyLogosService.name);

  constructor(
    private readonly storage: UploadStorageService,
    private readonly audit: StaffAuditService,
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

  /** Square, transparent padding, metadata stripped. */
  private async toSquareWebp(file: Express.Multer.File): Promise<Buffer> {
    if (!file?.buffer?.length) {
      throw codedBadRequest(
        'COMPANY_LOGO_MISSING',
        'Missing file field "file".',
      );
    }
    const mime = (file.mimetype ?? '').trim().toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      throw codedBadRequest(
        'COMPANY_LOGO_TYPE_FORBIDDEN',
        'Only PNG, JPEG or WebP images are allowed.',
      );
    }
    try {
      return await sharp(file.buffer)
        .rotate()
        .resize(LOGO_SIZE, LOGO_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 90 })
        .toBuffer();
    } catch {
      throw codedBadRequest(
        'COMPANY_LOGO_PROCESS_FAILED',
        'Could not read the image (try another PNG, JPEG or WebP file).',
      );
    }
  }

  async upload(
    actor: StaffActor,
    companyId: string,
    file: Express.Multer.File,
  ): Promise<StaffCompanyLogoResponse> {
    await assertStaffCanAccessCompany(companyId, actor);
    const webp = await this.toSquareWebp(file);
    const { db } = this.requireDb();

    const key = `${companyId}/${randomUUID()}.webp`;
    await this.storage.put('logo', key, webp, 'image/webp');
    const now = new Date();
    let previous: string | null = null;
    try {
      previous = await db.transaction(async (tx) => {
        const [row] = await tx
          .select({ key: companies.logoStorageKey })
          .from(companies)
          .where(eq(companies.id, companyId))
          .for('update')
          .limit(1);
        await tx
          .update(companies)
          .set({ logoStorageKey: key, logoUpdatedAt: now, updatedAt: now })
          .where(eq(companies.id, companyId));
        return row?.key ?? null;
      });
    } catch (e) {
      await this.removeQuietly(key);
      throw e;
    }
    if (previous) {
      await this.removeQuietly(previous);
    }
    await this.audit.log({
      actorUserId: actor.actorUserId,
      action: 'company.logo_upload',
      entityType: 'company',
      entityId: companyId,
    });
    return { logoUrl: companyLogoUrl(companyId, now) };
  }

  async remove(actor: StaffActor, companyId: string): Promise<{ ok: true }> {
    await assertStaffCanAccessCompany(companyId, actor);
    const { db } = this.requireDb();
    const previous = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ key: companies.logoStorageKey })
        .from(companies)
        .where(eq(companies.id, companyId))
        .for('update')
        .limit(1);
      await tx
        .update(companies)
        .set({
          logoStorageKey: null,
          logoUpdatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));
      return row?.key ?? null;
    });
    if (previous) {
      await this.removeQuietly(previous);
      await this.audit.log({
        actorUserId: actor.actorUserId,
        action: 'company.logo_remove',
        entityType: 'company',
        entityId: companyId,
      });
    }
    return { ok: true };
  }

  /** Slug → URL of every company with an uploaded logo (logos are public). */
  async publicMap(): Promise<PublicCompanyLogosResponse> {
    const { db } = this.requireDb();
    const rows = await db
      .select({
        id: companies.id,
        slug: companies.slug,
        updatedAt: companies.logoUpdatedAt,
      })
      .from(companies)
      .where(isNotNull(companies.logoStorageKey));
    const map: PublicCompanyLogosResponse = {};
    for (const r of rows) {
      if (r.updatedAt) map[r.slug] = companyLogoUrl(r.id, r.updatedAt);
    }
    return map;
  }

  async publicImage(companyId: string): Promise<Buffer> {
    const { db } = this.requireDb();
    const [row] = await db
      .select({ key: companies.logoStorageKey })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    const buffer = row?.key ? await this.storage.get('logo', row.key) : null;
    if (!buffer) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'No logo for this company');
    }
    return buffer;
  }

  private async removeQuietly(key: string): Promise<void> {
    try {
      await this.storage.remove('logo', key);
    } catch (error) {
      this.logger.warn(
        `could not remove logo ${key}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
