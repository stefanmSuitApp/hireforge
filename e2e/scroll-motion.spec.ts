import { expect, test } from '@playwright/test';

// A clipping wrapper with overflow-hidden is a scroll container, so the
// scroll-linked reveals inside it froze half way (the About timeline line).
for (const path of ['/sr', '/sr/jobs', '/sr/employers', '/sr/about']) {
  test(`scroll animations on ${path} follow the page scroll`, async ({
    page,
  }) => {
    await page.goto(path);
    const stuck = await page.evaluate(() =>
      document.getAnimations().flatMap((a) => {
        const tl = a.timeline as { source?: Element | null } | null;
        if (!tl || !('source' in tl)) return [];
        if (tl.source === document.scrollingElement) return [];
        const el = (a.effect as KeyframeEffect | null)?.target;
        return [`${el?.className} → ${tl.source?.tagName}`];
      }),
    );
    expect(stuck).toEqual([]);
  });
}
