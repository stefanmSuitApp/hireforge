import { describe, expect, it } from 'vitest';

import { buildRobots } from './robots';
import {
  chunk,
  companyEntries,
  jobEntries,
  landingEntries,
  sitemapIndexXml,
  urlsetXml,
} from './sitemap';

const ORIGIN = 'https://sljakam.com';

describe('buildRobots', () => {
  it('allows public pages and hides workspaces, API and apply on production', () => {
    const r = buildRobots(ORIGIN, 'sljakam.com');
    expect(r.sitemap).toBe('https://sljakam.com/sitemap.xml');
    expect(r.rules).toMatchObject({ userAgent: '*', allow: '/' });
    const disallow = (r.rules as { disallow: string[] }).disallow;
    for (const p of [
      '/api/',
      '/*/candidate/',
      '/*/employer/',
      '/*/moderator/',
      '/*/admin/',
      '/*/jobs/*/apply',
      '/*/integration',
    ]) {
      expect(disallow).toContain(p);
    }
    // `/employers` (public directory) must not be caught by `/*/employer/`.
    expect(disallow).not.toContain('/*/employers');
  });

  it('disallows everything on any other host', () => {
    expect(buildRobots(ORIGIN, '178.105.128.190').rules).toEqual({
      userAgent: '*',
      disallow: '/',
    });
    expect(buildRobots(ORIGIN, 'www.sljakam.com').sitemap).toBeUndefined();
  });
});

describe('sitemaps', () => {
  it('lists every locale with sr, en and x-default alternates', () => {
    const xml = urlsetXml(ORIGIN, [
      { path: '/jobs/a-b1c2', lastmod: '2026-10-01T00:00:00.000Z' },
    ]);
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).toContain('<loc>https://sljakam.com/sr/jobs/a-b1c2</loc>');
    expect(xml).toContain('<loc>https://sljakam.com/en/jobs/a-b1c2</loc>');
    expect(xml).toContain(
      'hreflang="x-default" href="https://sljakam.com/sr/jobs/a-b1c2"',
    );
    expect(xml).toContain('<lastmod>2026-10-01T00:00:00.000Z</lastmod>');
  });

  it('escapes XML and builds an index', () => {
    expect(urlsetXml(ORIGIN, [{ path: '/p/a&b' }])).toContain('/p/a&amp;b');
    expect(
      sitemapIndexXml(ORIGIN, [{ name: 'jobs-0.xml', lastmod: null }]),
    ).toContain('<loc>https://sljakam.com/sitemaps/jobs-0.xml</loc>');
  });

  it('splits large sets so each file stays within 5 000 URLs', () => {
    const parts = chunk(Array.from({ length: 5001 }, (_, i) => i));
    expect(parts.map((p) => p.length)).toEqual([2500, 2500, 1]);
  });

  it('lists only landing pages and companies with live jobs', () => {
    const entries = landingEntries([
      { city: 'beograd', category: 'it', liveJobs: 2, lastmod: '2026-10-02' },
      { city: 'nis', category: null, liveJobs: 1, lastmod: '2026-10-01' },
      { city: 'novi-sad', category: 'it', liveJobs: 0, lastmod: null },
    ]).map((e) => e.path);
    expect(entries).toEqual([
      '/jobs/category/it',
      '/jobs/category/it/city/beograd',
      '/jobs/city/beograd',
      '/jobs/city/nis',
    ]);
    expect(
      companyEntries([
        { slug: 'a', liveJobs: 1, lastmod: null },
        { slug: 'b', liveJobs: 0, lastmod: null },
      ]).map((e) => e.path),
    ).toEqual(['/companies/a']);
  });

  it('uses the slug for job URLs and falls back to the id', () => {
    expect(
      jobEntries([
        { id: 'u1', slug: 'dev-beograd-ab12', lastmod: 'x' },
        { id: 'u2', slug: null, lastmod: 'y' },
      ]).map((e) => e.path),
    ).toEqual(['/jobs/dev-beograd-ab12', '/jobs/u2']);
  });
});
