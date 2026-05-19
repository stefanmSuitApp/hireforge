import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { entitlementsBlobSchema } from 'contracts';
import { eq } from 'drizzle-orm';
import { jobDescriptionMedia, jobs, subscriptions } from 'database';
import sharp from 'sharp';

import {
  codedBadRequest,
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { JobMediaStorageService } from './job-media-storage.service';

const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 630;

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg']);

/**
 * Returned `url` is embedded in job description HTML rendered on the Next app.
 * Prefer a **same-origin** path (`/api/…`) proxied by Next → Nest so the browser does not hit
 * a different origin/port (fixes images missing on moderator/candidate previews when Nest is `:4000` and Next is `:3000`).
 *
 * When `JOB_DESCRIPTION_MEDIA_PUBLIC_ORIGIN` is set (e.g. CDN or API-only hostnames), emit an absolute URL there.
 */
function publicUrlForMediaId(mediaId: string): string {
  const configured = process.env.JOB_DESCRIPTION_MEDIA_PUBLIC_ORIGIN?.trim();
  if (!configured) {
    return `/api/public/job-description-media/${mediaId}`;
  }
  const origin = configured.replace(/\/$/, '');
  return `${origin}/api/public/job-description-media/${mediaId}`;
}

@Injectable()
export class JobDescriptionMediaService {
  constructor(private readonly storage: JobMediaStorageService) {}

  async getPublicFile(
    mediaId: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const database = getDb();
    if (!database) {
      return null;
    }
    const [row] = await database.db
      .select({
        storageKey: jobDescriptionMedia.storageKey,
        mimeType: jobDescriptionMedia.mimeType,
      })
      .from(jobDescriptionMedia)
      .where(eq(jobDescriptionMedia.id, mediaId))
      .limit(1);
    if (!row) {
      return null;
    }
    const buf = await this.storage.get(row.storageKey);
    if (!buf) {
      return null;
    }
    return { buffer: buf, mimeType: row.mimeType };
  }

  private async assertJobAllowsImageUpload(jobId: string): Promise<{
    job: { companyId: string; status: string; subscriptionId: string | null };
  }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not available',
      );
    }
    const [row] = await database.db
      .select({
        companyId: jobs.companyId,
        status: jobs.status,
        subscriptionId: jobs.subscriptionId,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (
      row.status !== 'draft' &&
      row.status !== 'submitted' &&
      row.status !== 'published'
    ) {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Images can only be attached while the listing is draft, submitted, or live.',
      );
    }
    if (!row.subscriptionId) {
      throw codedForbidden(
        'JOB_POSTING_NO_SUBSCRIPTION',
        'This listing is not linked to a subscription.',
      );
    }
    const [sub] = await database.db
      .select({
        entitlementsJsonSnapshot: subscriptions.entitlementsJsonSnapshot,
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, row.subscriptionId))
      .limit(1);
    if (!sub) {
      throw codedNotFound('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }
    const parsed = entitlementsBlobSchema.safeParse(
      sub.entitlementsJsonSnapshot,
    );
    if (!parsed.success) {
      throw codedBadRequest(
        'PACKAGE_ENTITLEMENTS_INCOMPLETE',
        'Subscription entitlements are invalid',
      );
    }
    if (!parsed.data.editor.image_upload) {
      throw codedForbidden(
        'JOB_DESCRIPTION_IMAGE_NOT_ENTITLED',
        'Your package does not include images inside the job description.',
      );
    }
    return { job: { ...row } };
  }

  async uploadAsEmployer(
    employerUserId: string,
    companyId: string,
    jobId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not available',
      );
    }
    const { job } = await this.assertJobAllowsImageUpload(jobId);
    if (job.companyId !== companyId) {
      throw codedForbidden(
        'JOB_FORBIDDEN_COMPANY',
        'Job belongs to another company',
      );
    }
    const { buffer, width, height } = await this.transformUpload(file);

    const id = randomUUID();
    const key = `job-description-media/${id}.avif`;
    await this.storage.put(key, buffer);

    await database.db.insert(jobDescriptionMedia).values({
      id,
      jobId,
      createdByUserId: employerUserId,
      storageKey: key,
      mimeType: 'image/avif',
      bytes: buffer.length,
      width,
      height,
    });

    return { url: publicUrlForMediaId(id) };
  }

  async uploadAsModerator(
    actorUserId: string,
    jobId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    await this.assertJobAllowsImageUpload(jobId);
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not available',
      );
    }
    const { buffer, width, height } = await this.transformUpload(file);

    const id = randomUUID();
    const key = `job-description-media/${id}.avif`;
    await this.storage.put(key, buffer);

    await database.db.insert(jobDescriptionMedia).values({
      id,
      jobId,
      createdByUserId: actorUserId,
      storageKey: key,
      mimeType: 'image/avif',
      bytes: buffer.length,
      width,
      height,
    });

    return { url: publicUrlForMediaId(id) };
  }

  private async transformUpload(
    file: Express.Multer.File,
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    if (!file?.buffer?.length) {
      throw codedBadRequest(
        'JOB_DESCRIPTION_IMAGE_PAYLOAD_MISSING',
        'Missing multipart field "file".',
      );
    }
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      throw codedBadRequest(
        'JOB_DESCRIPTION_IMAGE_TOO_LARGE',
        'Image must be at most 2 MB.',
      );
    }
    const mime = (file.mimetype ?? '').trim().toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      throw codedBadRequest(
        'JOB_DESCRIPTION_IMAGE_TYPE_FORBIDDEN',
        'Only PNG or JPEG images are allowed.',
      );
    }
    try {
      const pipeline = sharp(file.buffer).rotate();
      const meta = await pipeline.metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w < MIN_WIDTH || h < MIN_HEIGHT) {
        throw codedBadRequest(
          'JOB_DESCRIPTION_IMAGE_DIMENSIONS_INVALID',
          `Image must be at least ${MIN_WIDTH}×${MIN_HEIGHT} pixels (received ${w}×${h}).`,
        );
      }
      const avif = await pipeline.avif({ quality: 72 }).toBuffer();
      const outMeta = await sharp(avif).metadata();
      return {
        buffer: avif,
        width: outMeta.width ?? w,
        height: outMeta.height ?? h,
      };
    } catch (e: unknown) {
      if (e instanceof BadRequestException || e instanceof ForbiddenException) {
        throw e;
      }
      throw codedBadRequest(
        'JOB_DESCRIPTION_IMAGE_PROCESS_FAILED',
        'Could not process image (try another PNG/JPEG file).',
      );
    }
  }
}
