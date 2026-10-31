// Company logos that staff upload: stored as a 256 px square WebP in the
// uploads storage, listed in the public slug → URL map the site merges over
// Sanity's, served with long caching (the URL carries a version), and
// replaced or removed without leaving old files behind.
import { readdirSync } from 'node:fs';

import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import { insertCompany } from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Actor,
  http,
  signInAs,
  startApp,
  stopApp,
} from './__harness__/test-app';

let app: INestApplication;
let moderator: Actor;
let otherModerator: Actor;

const png = (width = 400, height = 200) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 20, g: 120, b: 90, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

const logoFiles = () => {
  try {
    return readdirSync(process.env['COMPANY_LOGO_DIR'] as string, {
      recursive: true,
      withFileTypes: true,
    }).filter((d) => d.isFile());
  } catch {
    return [];
  }
};

const bytes = (res: import('supertest').Test) =>
  res.buffer(true).parse((r, cb) => {
    const chunks: Buffer[] = [];
    r.on('data', (c: Buffer) => chunks.push(c));
    r.on('end', () => cb(null, Buffer.concat(chunks)));
  });

beforeAll(async () => {
  app = await startApp();
  const server = app.getHttpServer();
  [moderator, otherModerator] = await Promise.all([
    signInAs(server, 'moderator'),
    signInAs(server, 'moderator'),
  ]);
});
afterAll(() => stopApp(app));

async function upload(companyId: string, file: Buffer, type = 'image/png') {
  return http(app)
    .post(`/api/moderator/companies/${companyId}/logo`)
    .set(moderator.headers)
    .attach('file', file, { filename: 'logo.png', contentType: type });
}

describe('staff upload a company logo', () => {
  it('is served as a square WebP and listed in the public map', async () => {
    const company = await insertCompany();
    const res = await upload(company.id, await png());
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.logoUrl).toMatch(
      new RegExp(`^/api/public/company-logos/${company.id}\\?v=\\d+$`),
    );

    const map = await http(app).get('/api/public/company-logos').expect(200);
    expect(map.body[company.slug]).toBe(res.body.logoUrl);

    const image = await bytes(
      http(app).get(`/api/public/company-logos/${company.id}`),
    ).expect(200);
    expect(image.headers['content-type']).toBe('image/webp');
    expect(image.headers['cache-control']).toContain('immutable');
    const meta = await sharp(image.body as Buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 256, 256]);

    const detail = await http(app)
      .get(`/api/moderator/companies/${company.id}`)
      .set(moderator.headers)
      .expect(200);
    expect(detail.body.logoUrl).toBe(res.body.logoUrl);
  });

  it('replacing gives a new URL and removes the old file; removing clears it', async () => {
    const company = await insertCompany();
    const before = logoFiles().length;
    const first = await upload(company.id, await png());
    const second = await upload(company.id, await png(300, 300));
    expect(second.body.logoUrl).not.toBe(first.body.logoUrl);
    expect(logoFiles().length).toBe(before + 1);

    await http(app)
      .delete(`/api/moderator/companies/${company.id}/logo`)
      .set(moderator.headers)
      .expect(200);
    expect(logoFiles().length).toBe(before);
    const map = await http(app).get('/api/public/company-logos').expect(200);
    expect(map.body[company.slug]).toBeUndefined();
    await http(app).get(`/api/public/company-logos/${company.id}`).expect(404);
  });

  it('refuses a file that is not a PNG, JPEG or WebP image', async () => {
    const company = await insertCompany();
    const res = await upload(
      company.id,
      Buffer.from('<svg onload="alert(1)"/>'),
      'image/svg+xml',
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COMPANY_LOGO_TYPE_FORBIDDEN');
    const broken = await upload(company.id, Buffer.from('not an image'));
    expect(broken.status).toBe(400);
    expect(broken.body.error.code).toBe('COMPANY_LOGO_PROCESS_FAILED');
  });

  it("is refused for another moderator's company", async () => {
    const company = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: otherModerator.id,
    });
    const res = await upload(company.id, await png());
    expect(res.status).toBe(403);
  });
});
