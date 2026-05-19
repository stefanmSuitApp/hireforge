import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Job description inline images (`job_description_media.storage_key`): S3 when
 * `S3_JOB_MEDIA_BUCKET` (+ endpoint + credentials) are set; otherwise filesystem
 * under `JOB_DESCRIPTION_MEDIA_LOCAL_DIR`.
 */
@Injectable()
export class JobMediaStorageService implements OnModuleInit {
  private readonly log = new Logger(JobMediaStorageService.name);
  private s3Client: S3Client | null = null;
  private s3Bucket: string | null = null;

  private get useS3(): boolean {
    return this.s3Client !== null && this.s3Bucket !== null;
  }

  onModuleInit(): void {
    const bucket = process.env.S3_JOB_MEDIA_BUCKET?.trim();
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
        `Job media storage: S3-compatible (${endpoint}, bucket=${bucket})`,
      );
      return;
    }
    if (bucket || endpoint) {
      this.log.warn(
        'Partial S3 env for job media; falling back to local JOB_DESCRIPTION_MEDIA_LOCAL_DIR.',
      );
    }
    this.log.log(`Job media storage: local (${this.rootDir()})`);
  }

  private rootDir(): string {
    const raw = process.env.JOB_DESCRIPTION_MEDIA_LOCAL_DIR?.trim();
    return path.resolve(process.cwd(), raw || 'var/job-description-media');
  }

  async put(key: string, body: Buffer): Promise<void> {
    if (this.useS3 && this.s3Client && this.s3Bucket) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: body,
          ContentType: 'image/avif',
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
