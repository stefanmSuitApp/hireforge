import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Billing PDF blobs: **S3-compatible object storage** when configured (production:
 * e.g. [Hetzner Object Storage](https://docs.hetzner.com/storage/object-storage/overview/)),
 * otherwise local filesystem under `BILLING_PDF_LOCAL_DIR`.
 *
 * Hetzner typical env:
 * - `S3_ENDPOINT=https://fsn1.your-objectstorage.com` (or `nbg1`, `hel1`)
 * - `S3_BILLING_BUCKET=…`
 * - `S3_REGION=fsn1` — use the same location id as in the endpoint when possible
 * - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` from Console
 * - Self-hosted MinIO: set `S3_FORCE_PATH_STYLE=true`
 */
@Injectable()
export class BillingStorageService implements OnModuleInit {
  private readonly log = new Logger(BillingStorageService.name);
  private s3Client: S3Client | null = null;
  private s3Bucket: string | null = null;

  private get useS3(): boolean {
    return this.s3Client !== null && this.s3Bucket !== null;
  }

  onModuleInit(): void {
    const bucket = process.env.S3_BILLING_BUCKET?.trim();
    const endpoint = process.env.S3_ENDPOINT?.trim();
    const keyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
    if (bucket && endpoint && keyId && secret) {
      const region =
        process.env.S3_REGION?.trim() ||
        process.env.AWS_REGION?.trim() ||
        'eu-central-1';
      this.s3Client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId: keyId, secretAccessKey: secret },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      });
      this.s3Bucket = bucket;
      this.log.log(
        `Billing PDF storage: S3-compatible (${endpoint}, bucket=${bucket})`,
      );
      return;
    }
    if (bucket || endpoint || keyId || secret) {
      this.log.warn(
        'Partial S3 env (need S3_BILLING_BUCKET, S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY); using local billing PDF dir',
      );
    }
    this.log.log(`Billing PDF storage: local (${this.rootDir()})`);
  }

  private rootDir(): string {
    const raw = process.env.BILLING_PDF_LOCAL_DIR?.trim();
    return path.resolve(process.cwd(), raw || 'var/billing-pdfs');
  }

  /** `key` is object key / relative path, e.g. `companies/{id}/billing/proforma-{id}.pdf`. */
  async put(key: string, body: Buffer): Promise<void> {
    if (this.useS3 && this.s3Client && this.s3Bucket) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: body,
          ContentType: 'application/pdf',
        }),
      );
      return;
    }

    const full = path.join(this.rootDir(), key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  async get(key: string): Promise<Buffer | null> {
    if (this.useS3 && this.s3Client && this.s3Bucket) {
      try {
        const out = await this.s3Client.send(
          new GetObjectCommand({ Bucket: this.s3Bucket, Key: key }),
        );
        const body = out.Body;
        if (!body) {
          return null;
        }
        const bytes = await body.transformToByteArray();
        return Buffer.from(bytes);
      } catch {
        return null;
      }
    }

    try {
      return await fs.readFile(path.join(this.rootDir(), key));
    } catch {
      return null;
    }
  }
}
