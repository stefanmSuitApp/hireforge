import type { Page } from '@playwright/test';

import { expect, test } from './support/fixtures';
import { createPublishedJob } from './support/db';

async function jsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  // Throws (fails the test) if any block isn't valid JSON.
  return blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
}

test('a live job page carries a JobPosting that matches what the visitor sees', async ({
  page,
}) => {
  const job = await createPublishedJob();
  await page.goto(`/sr/jobs/${job.slug}`);
  const visibleTitle = await page
    .getByRole('heading', { level: 1 })
    .innerText();

  const data = await jsonLd(page);
  const posting = data.find((d) => d['@type'] === 'JobPosting');
  expect(posting).toBeDefined();
  expect(posting?.['title']).toBe(visibleTitle);
  for (const key of [
    'description',
    'datePosted',
    'hiringOrganization',
    'jobLocation',
    'employmentType',
    'identifier',
  ]) {
    expect(posting, key).toHaveProperty(key);
  }
  expect(posting?.['directApply']).toBe(true);
  expect(data.find((d) => d['@type'] === 'BreadcrumbList')).toBeDefined();
});

test('an expired ad has no JobPosting', async ({ page }) => {
  const job = await createPublishedJob({
    expiresAt: new Date(Date.now() - 60_000),
  });
  await page.goto(`/sr/jobs/${job.slug}`);
  const types = (await jsonLd(page)).map((d) => d['@type']);
  expect(types).not.toContain('JobPosting');
});

test('the home page names the site with and without the diacritic', async ({
  page,
}) => {
  await page.goto('/sr');
  const org = (await jsonLd(page)).find((d) => d['@type'] === 'Organization');
  expect(org?.['alternateName']).toEqual(['Sljakam', 'sljakam.com']);
  expect(
    (
      await page.request.get(
        String(org?.['logo']).replace(/^https?:\/\/[^/]+/, ''),
      )
    ).status(),
  ).toBe(200);
});
