import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Kinds of uploaded file; each is a folder in the bucket and on disk. */
export type UploadArea = 'cv' | 'photo';

/** Disk folders when no bucket is configured (dev, tests, until it exists). */
const LOCAL_ROOT: Record<UploadArea, { env: string; fallback: string }> = {
  cv: { env: 'CANDIDATE_UPLOAD_DIR', fallback: 'var/candidate-uploads' },
  photo: { env: 'CANDIDATE_PHOTO_DIR', fallback: 'var/candidate-photos' },
};

// Keys are generated (ids + extension); refuse anything that could leave the
// area folder on disk.
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.split('/').includes('..')) {
    throw new Error(`Unsafe upload key: ${key}`);
  }
}

/**
 * Uploaded files (CVs; logos and photos next). With `S3_UPLOADS_BUCKET`
 * they live in the bucket under `S3_UPLOADS_PREFIX` (`production/`,
 * `staging/`: one bucket for both); otherwise on disk as before.
 */
@Injectable()
export class UploadStorageService implements OnModuleInit {
  private readonly log = new Logger(UploadStorageService.name);
  private s3: { client: S3Client; bucket: string; prefix: string } | null =
    null;

  onModuleInit(): void {
    const env = (k: string) => process.env[k]?.trim() || '';
    const bucket = env('S3_UPLOADS_BUCKET');
    if (!bucket) {
      this.log.log('Uploads: local disk (S3_UPLOADS_BUCKET not set)');
      return;
    }
    const missing = [
      'S3_UPLOADS_PREFIX',
      'S3_ENDPOINT',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ].filter((k) => !env(k));
    // Without a prefix staging would write into production's folder: refuse
    // to start (the deploy's health gate then rolls back).
    if (missing.length) {
      throw new Error(
        `S3_UPLOADS_BUCKET is set but ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} missing`,
      );
    }
    this.s3 = {
      bucket,
      prefix: env('S3_UPLOADS_PREFIX').replace(/\/*$/, '/'),
      client: new S3Client({
        region: env('S3_REGION') || 'eu-central-1',
        endpoint: env('S3_ENDPOINT'),
        credentials: {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
        },
        forcePathStyle: env('S3_FORCE_PATH_STYLE') === 'true',
        // Not every S3-compatible store accepts the SDK's default checksums.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      }),
    };
    this.log.log(`Uploads: bucket ${bucket}, prefix ${this.s3.prefix}`);
  }

  private objectKey(area: UploadArea, key: string): string {
    return `${this.s3?.prefix ?? ''}${area}/${key}`;
  }

  private localPath(area: UploadArea, key: string): string {
    const { env, fallback } = LOCAL_ROOT[area];
    const root = process.env[env]?.trim()
      ? path.resolve(process.env[env] as string)
      : path.join(process.cwd(), fallback);
    return path.join(root, ...key.split('/'));
  }

  async put(
    area: UploadArea,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    assertSafeKey(key);
    if (this.s3) {
      await this.s3.client.send(
        new PutObjectCommand({
          Bucket: this.s3.bucket,
          Key: this.objectKey(area, key),
          Body: body,
          ContentType: contentType,
        }),
      );
      return;
    }
    const full = this.localPath(area, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  /** The file, or null when it does not exist. Other errors are thrown. */
  async get(area: UploadArea, key: string): Promise<Buffer | null> {
    assertSafeKey(key);
    if (this.s3) {
      try {
        const out = await this.s3.client.send(
          new GetObjectCommand({
            Bucket: this.s3.bucket,
            Key: this.objectKey(area, key),
          }),
        );
        return out.Body
          ? Buffer.from(await out.Body.transformToByteArray())
          : null;
      } catch (e) {
        if (e instanceof NoSuchKey) return null;
        throw e;
      }
    }
    try {
      return await fs.readFile(this.localPath(area, key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  /** Removes the file; a missing one is not an error. */
  async remove(area: UploadArea, key: string): Promise<void> {
    assertSafeKey(key);
    if (this.s3) {
      await this.s3.client.send(
        new DeleteObjectCommand({
          Bucket: this.s3.bucket,
          Key: this.objectKey(area, key),
        }),
      );
      return;
    }
    try {
      await fs.unlink(this.localPath(area, key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
}
