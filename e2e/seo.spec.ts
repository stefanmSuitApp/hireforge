import { expect, test } from './support/fixtures';
import { createPublishedJob } from './support/db';
import { WEB_ORIGIN } from './support/ports';

const origin = () => WEB_ORIGIN;

test('robots.txt opens public pages and hides private ones', async ({
  request,
}) => {
  const body = await (await request.get('/robots.txt')).text();
  expect(body).toContain('Allow: /');
  for (const p of [
    '/api/',
    '/*/candidate/',
    '/*/employer/',
    '/*/jobs/*/apply',
  ]) {
    expect(body).toContain(`Disallow: ${p}`);
  }
  expect(body).toContain(`Sitemap: ${origin()}/sitemap.xml`);
});

test('robots.txt on any other host disallows everything', async ({
  request,
}) => {
  const body = await (
    await request.get('/robots.txt', { headers: { host: 'staging.example' } })
  ).text();
  expect(body).toMatch(/Disallow: \/\s*$/m);
  expect(body).not.toContain('Sitemap:');
});

test('the sitemap index lists live jobs, companies and landing pages, no sign-in', async ({
  request,
}) => {
  const live = await createPublishedJob();
  const expired = await createPublishedJob({
    expiresAt: new Date(Date.now() - 60_000),
  });

  const index = await (await request.get('/sitemap.xml')).text();
  expect(index).toContain('<sitemapindex');
  for (const name of [
    'pages.xml',
    'landing-0.xml',
    'companies-0.xml',
    'jobs-0.xml',
  ]) {
    expect(index).toContain(`${origin()}/sitemaps/${name}`);
  }

  const jobs = await (await request.get('/sitemaps/jobs-0.xml')).text();
  expect(jobs).toContain(`<loc>${origin()}/sr/jobs/${live.slug}</loc>`);
  expect(jobs).toContain(`<loc>${origin()}/en/jobs/${live.slug}</loc>`);
  expect(jobs).toContain(
    `hreflang="x-default" href="${origin()}/sr/jobs/${live.slug}"`,
  );
  expect(jobs).not.toContain(expired.slug);

  const pages = await (await request.get('/sitemaps/pages.xml')).text();
  expect(pages).toContain(`<loc>${origin()}/sr/jobs</loc>`);
  expect(pages).not.toContain('sign-in');

  const landing = await (await request.get('/sitemaps/landing-0.xml')).text();
  expect(landing).toContain(`<loc>${origin()}/sr/jobs/city/beograd</loc>`);
  expect(landing).toContain(`<loc>${origin()}/sr/jobs/category/it</loc>`);
  expect(landing).not.toContain('novi-sad');

  for (const url of [...jobs.matchAll(/<loc>([^<]+)<\/loc>/g)].slice(0, 4)) {
    expect((await request.get(url[1] ?? '')).status(), url[1]).toBe(200);
  }
});
