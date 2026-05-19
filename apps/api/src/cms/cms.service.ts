import { Injectable } from '@nestjs/common';
import { createClient } from '@sanity/client';
import { cmsSyncPackageRequestSchema } from 'contracts';
import { timingSafeEqual } from 'crypto';
import {
  mapSanityPackageDefinitionDoc,
  upsertPackageMirrorAndAudit,
} from 'server-cms-sync';

import { getDb } from '../database';
import {
  codedBadRequest,
  codedNotFound,
  codedServiceUnavailable,
  codedUnauthorized,
} from '../http/coded-http';

function secretsEqual(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

@Injectable()
export class CmsService {
  private assertSyncSecret(header: string | undefined): void {
    const expected = process.env.CMS_SYNC_SECRET?.trim();
    if (!expected) {
      throw codedServiceUnavailable(
        'SERVICE_UNAVAILABLE',
        'CMS package sync is not configured (CMS_SYNC_SECRET)',
      );
    }
    if (typeof header !== 'string' || !header.trim()) {
      throw codedUnauthorized('UNAUTHORIZED', 'Invalid sync credentials');
    }
    if (!secretsEqual(header.trim(), expected)) {
      throw codedUnauthorized('UNAUTHORIZED', 'Invalid sync credentials');
    }
  }

  private resolveDocumentInput(
    body: unknown,
  ): { doc: unknown } | { fetchId: string } | null {
    const parsed = cmsSyncPackageRequestSchema.safeParse(body);
    if (parsed.success && parsed.data.document) {
      return { doc: parsed.data.document };
    }
    if (parsed.success && parsed.data.documentId?.trim()) {
      return { fetchId: parsed.data.documentId.trim() };
    }
    const rec =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;
    if (rec && rec['_type'] === 'packageDefinition') {
      return { doc: body };
    }
    return null;
  }

  private async fetchSanityPackageDoc(id: string): Promise<unknown> {
    const projectId =
      process.env.SANITY_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
    const dataset =
      process.env.SANITY_DATASET?.trim() ||
      process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
    const token = process.env.SANITY_API_READ_TOKEN?.trim();
    if (!projectId || !dataset) {
      throw codedServiceUnavailable(
        'SERVICE_UNAVAILABLE',
        'Sanity project is not configured',
      );
    }
    if (!token) {
      throw codedServiceUnavailable(
        'SERVICE_UNAVAILABLE',
        'SANITY_API_READ_TOKEN is required to fetch documents by id',
      );
    }
    const client = createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: false,
      token,
    });
    const doc = await client.getDocument(id);
    if (!doc) {
      throw codedNotFound('NOT_FOUND', 'Sanity document not found');
    }
    return doc;
  }

  async syncPackage(
    body: unknown,
    secretHeader: string | undefined,
  ): Promise<{ ok: true; code: string }> {
    this.assertSyncSecret(secretHeader);
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not available',
      );
    }
    const resolved = this.resolveDocumentInput(body);
    if (!resolved) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Body must include a packageDefinition document, { document }, or { documentId }',
      );
    }
    const raw =
      'doc' in resolved
        ? resolved.doc
        : await this.fetchSanityPackageDoc(resolved.fetchId);
    let payload;
    try {
      payload = mapSanityPackageDefinitionDoc(raw);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid package document';
      throw codedBadRequest('VALIDATION_FAILED', message);
    }
    await upsertPackageMirrorAndAudit(database.db, payload, {
      source: 'cms_webhook',
    });
    return { ok: true, code: payload.code };
  }
}
