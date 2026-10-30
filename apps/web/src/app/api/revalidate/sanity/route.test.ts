import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidateTag, revalidatePath } = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidateTag,
  revalidatePath,
  unstable_cache: (fn: unknown) => fn,
}));

import { POST } from './route';

const publish = (body: unknown) =>
  POST(
    new NextRequest('https://sljakam.com/api/revalidate/sanity', {
      method: 'POST',
      headers: { 'x-sanity-webhook-secret': 's3cret' },
      body: JSON.stringify(body),
    }),
  );

describe('Sanity publish webhook', () => {
  beforeEach(() => {
    revalidateTag.mockReset();
    revalidatePath.mockReset();
    vi.stubEnv('SANITY_WEBHOOK_SECRET', 's3cret');
  });

  it('refreshes the home tiles when they are published', async () => {
    const res = await publish({ _type: 'homeJobsDiscovery' });
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('cms:homeJobsDiscovery', 'max');
  });

  it('refreshes the About page when its editorial page is published', async () => {
    const res = await publish({
      _type: 'editorialPage',
      slug: { current: 'about-hireforge' },
    });
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith('/sr/about');
    expect(revalidatePath).toHaveBeenCalledWith('/en/about');
  });
});
