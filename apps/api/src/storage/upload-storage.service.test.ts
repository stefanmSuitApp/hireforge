import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UploadStorageService } from './upload-storage.service';

const S3_ENV = [
  'S3_UPLOADS_BUCKET',
  'S3_UPLOADS_PREFIX',
  'S3_ENDPOINT',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

describe('UploadStorageService on disk (no bucket)', () => {
  let dir: string;
  let storage: UploadStorageService;
  const saved = { ...process.env };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hf-uploads-'));
    for (const k of S3_ENV) delete process.env[k];
    process.env['CANDIDATE_UPLOAD_DIR'] = dir;
    storage = new UploadStorageService();
    storage.onModuleInit();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    process.env = { ...saved };
  });

  it('writes, reads and removes a file under the area folder', async () => {
    const key = 'c1/f1.pdf';
    await storage.put('cv', key, Buffer.from('pdf'), 'application/pdf');
    expect((await storage.get('cv', key))?.toString()).toBe('pdf');
    await storage.remove('cv', key);
    expect(await storage.get('cv', key)).toBeNull();
  });

  it('a missing file is null on read and fine to remove', async () => {
    expect(await storage.get('cv', 'nope/none.pdf')).toBeNull();
    await expect(storage.remove('cv', 'nope/none.pdf')).resolves.toBe(
      undefined,
    );
  });

  it.each(['../etc/passwd', 'a/../../b', '/abs.pdf', 'a//b', '.hidden'])(
    'refuses the unsafe key %s',
    async (key) => {
      await expect(storage.get('cv', key)).rejects.toThrow(/Unsafe/);
      await expect(
        storage.put('cv', key, Buffer.from('x'), 'text/plain'),
      ).rejects.toThrow(/Unsafe/);
    },
  );
});

describe('UploadStorageService with a bucket', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('refuses to start without a prefix (staging must not write into production/)', () => {
    Object.assign(process.env, {
      S3_UPLOADS_BUCKET: 'hireforge-uploads',
      S3_ENDPOINT: 'https://nbg1.your-objectstorage.com',
      AWS_ACCESS_KEY_ID: 'k',
      AWS_SECRET_ACCESS_KEY: 's',
    });
    delete process.env['S3_UPLOADS_PREFIX'];
    expect(() => new UploadStorageService().onModuleInit()).toThrow(
      /S3_UPLOADS_PREFIX/,
    );
  });
});
