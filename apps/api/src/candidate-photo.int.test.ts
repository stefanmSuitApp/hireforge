// CV templates PR 5b: the candidate's CV photo at the API — any JPEG/PNG/WebP
// becomes a 600×600 JPEG, replacing removes the old file, and Moderan prints it.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import { insertCandidate } from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDocumentProxy, getResolvedPDFJS } from 'unpdf';

import { http, signIn, startApp, stopApp } from './__harness__/test-app';

let app: INestApplication;

beforeAll(async () => {
  app = await startApp();
});
afterAll(() => stopApp(app));

async function candidate() {
  const user = await insertCandidate({ verified: true });
  const session = await signIn(app.getHttpServer(), user);
  return { ...user, ...session };
}

const png = (w: number, h: number) =>
  sharp({
    create: { width: w, height: h, channels: 3, background: '#557788' },
  })
    .png()
    .toBuffer();

/** Photo files the candidate has on disk (the int tests use a temp dir). */
function photoFiles(candidateId: string): string[] {
  const dir = join(process.env['CANDIDATE_PHOTO_DIR'] ?? '', candidateId);
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

describe('CV photo', () => {
  it('a photo is stored as a 600×600 JPEG, replaced, and removed', async () => {
    const c = await candidate();
    await http(app).get('/api/candidate/photo').set(c.headers).expect(404);
    expect(
      (await http(app).get('/api/candidate/me').set(c.headers)).body.candidate
        .hasPhoto,
    ).toBe(false);

    await http(app)
      .post('/api/candidate/photo')
      .set(c.headers)
      .attach('file', await png(900, 1200), {
        filename: 'ja.png',
        contentType: 'image/png',
      })
      .expect(201);
    const me = await http(app).get('/api/candidate/me').set(c.headers);
    expect(me.body.candidate.hasPhoto).toBe(true);
    const photo = await http(app)
      .get('/api/candidate/photo')
      .set(c.headers)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (b: Buffer) => chunks.push(b));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(photo.headers['content-type']).toContain('image/jpeg');
    const meta = await sharp(photo.body as Buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 600, 600]);
    const candidateId = me.body.candidate.id as string;
    expect(photoFiles(candidateId)).toHaveLength(1);

    await http(app)
      .post('/api/candidate/photo')
      .set(c.headers)
      .attach('file', await png(400, 400), {
        filename: 'nova.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(photoFiles(candidateId)).toHaveLength(1);

    await http(app).delete('/api/candidate/photo').set(c.headers).expect(200);
    expect(photoFiles(candidateId)).toHaveLength(0);
    await http(app).get('/api/candidate/photo').set(c.headers).expect(404);
  });

  it('refuses a file that is not a photo, or a tiny one', async () => {
    const c = await candidate();
    for (const [buffer, name] of [
      [Buffer.from('%PDF-1.4\n%%EOF\n'), 'cv.pdf'],
      [await png(50, 50), 'mala.png'],
    ] as const) {
      const res = await http(app)
        .post('/api/candidate/photo')
        .set(c.headers)
        .attach('file', buffer, { filename: name });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANDIDATE_PHOTO_INVALID');
    }
  });

  it('a Moderan CV prints the photo when the candidate switched it on', async () => {
    const c = await candidate();
    await http(app)
      .post('/api/candidate/photo')
      .set(c.headers)
      .attach('file', await png(600, 600), { filename: 'ja.png' })
      .expect(201);
    const images = async (showPhoto: boolean) => {
      await http(app)
        .patch('/api/candidate/profile')
        .set(c.headers)
        .send({ fullName: 'Ana Fotić', cvProfile: { showPhoto } })
        .expect(200);
      const res = await http(app)
        .post('/api/candidate/resumes/generate')
        .set(c.headers)
        .send({ templateCode: 'moderan' })
        .expect(201);
      const file = await http(app)
        .get(`/api/candidate/resumes/${res.body.id}/download`)
        .set(c.headers)
        .buffer(true)
        .parse((r, done) => {
          const chunks: Buffer[] = [];
          r.on('data', (b: Buffer) => chunks.push(b));
          r.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      const pdf = await getDocumentProxy(new Uint8Array(file.body as Buffer));
      const { OPS } = await getResolvedPDFJS();
      const ops = await (await pdf.getPage(1)).getOperatorList();
      return ops.fnArray.filter((fn) => fn === OPS.paintImageXObject).length;
    };
    expect(await images(true)).toBe(1);
    expect(await images(false)).toBe(0);
  });
});
