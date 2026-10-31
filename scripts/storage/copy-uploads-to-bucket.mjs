#!/usr/bin/env node
/**
 * One-off: copies uploaded files (CVs) from the server's disk into the
 * uploads bucket, under the same keys the API uses
 * (`<S3_UPLOADS_PREFIX>cv/<storage_key>`). Runs inside the api image:
 *
 *   docker compose -f compose.prod.yml run --rm api \
 *     node scripts/storage/copy-uploads-to-bucket.mjs [--dry-run]
 *
 * Safe to run again: objects already in the bucket are skipped. Never
 * deletes the disk copies (remove them by hand once the site reads from the
 * bucket). Env: S3_UPLOADS_BUCKET, S3_UPLOADS_PREFIX, S3_ENDPOINT, S3_REGION,
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CANDIDATE_UPLOAD_DIR
 * (default `var/candidate-uploads`).
 */
import {
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

const env = (k) => process.env[k]?.trim() || '';
const dryRun = process.argv.includes('--dry-run');

const missing = [
  'S3_UPLOADS_BUCKET',
  'S3_UPLOADS_PREFIX',
  'S3_ENDPOINT',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
].filter((k) => !env(k));
if (missing.length) {
  console.error(`[copy-uploads] missing ${missing.join(', ')}`);
  process.exit(1);
}

const bucket = env('S3_UPLOADS_BUCKET');
const prefix = env('S3_UPLOADS_PREFIX').replace(/\/*$/, '/');
const s3 = new S3Client({
  region: env('S3_REGION') || 'eu-central-1',
  endpoint: env('S3_ENDPOINT'),
  credentials: {
    accessKeyId: env('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: env('S3_FORCE_PATH_STYLE') === 'true',
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const areas = [
  {
    area: 'cv',
    dir: resolve(env('CANDIDATE_UPLOAD_DIR') || 'var/candidate-uploads'),
  },
  {
    area: 'photo',
    dir: resolve(env('CANDIDATE_PHOTO_DIR') || 'var/candidate-photos'),
  },
];

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    if (e instanceof NotFound || e?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw e;
  }
}

async function files(dir) {
  try {
    const entries = await readdir(dir, {
      recursive: true,
      withFileTypes: true,
    });
    return entries
      .filter((d) => d.isFile())
      .map((d) => join(d.parentPath ?? d.path, d.name));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

let copied = 0;
let skipped = 0;
for (const { area, dir } of areas) {
  const list = await files(dir);
  console.log(`[copy-uploads] ${area}: ${list.length} file(s) in ${dir}`);
  for (const file of list) {
    const key = `${prefix}${area}/${relative(dir, file).split(sep).join('/')}`;
    if (await exists(key)) {
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: await readFile(file),
          ContentType:
            CONTENT_TYPES[extname(file).toLowerCase()] ??
            'application/octet-stream',
        }),
      );
    }
    copied += 1;
  }
}
console.log(
  `[copy-uploads] ${dryRun ? 'would copy' : 'copied'} ${copied}, already there ${skipped}`,
);
