import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type SanityWebhookPayload = {
  _type?: string;
  slug?: { current?: string } | string;
  companySlug?: string;
};

function readSecret(req: NextRequest): string {
  return (
    req.headers.get('x-sanity-webhook-secret')?.trim() ||
    req.nextUrl.searchParams.get('secret')?.trim() ||
    ''
  );
}

function slugFromPayload(payload: SanityWebhookPayload): string {
  if (typeof payload.slug === 'string') return payload.slug.trim();
  return payload.slug?.current?.trim() || '';
}

export async function POST(req: NextRequest) {
  const expected = process.env['SANITY_WEBHOOK_SECRET']?.trim() || '';
  if (!expected) {
    return Response.json(
      { ok: false, error: 'SANITY_WEBHOOK_SECRET is not configured' },
      { status: 503 },
    );
  }

  const provided = readSecret(req);
  if (!provided || provided !== expected) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let payload: SanityWebhookPayload = {};
  try {
    payload = (await req.json()) as SanityWebhookPayload;
  } catch {
    // Allow empty body to still trigger broad CMS revalidation.
  }

  const changedType = payload._type || '';
  const changedSlug = slugFromPayload(payload);
  const changedCompanySlug = payload.companySlug?.trim() || changedSlug;

  if (changedType === 'campaignCalendar') {
    revalidateTag('cms:campaignCalendar', 'max');
  }

  // Broad tags used by current CMS query layer.
  revalidateTag('cms:navigation', 'max');
  revalidateTag('cms:siteSettings', 'max');

  // Type-specific cache invalidation + likely page paths.
  if (changedType === 'employerBranding' && changedCompanySlug) {
    revalidateTag(`cms:employerBranding:${changedCompanySlug}`, 'max');
    revalidatePath(`/sr/companies/${changedCompanySlug}`);
    revalidatePath(`/en/companies/${changedCompanySlug}`);
  }

  if (changedType === 'editorialPage' && changedSlug) {
    revalidateTag(`cms:editorialPage:${changedSlug}`, 'max');
    revalidatePath(`/sr/p/${changedSlug}`);
    revalidatePath(`/en/p/${changedSlug}`);
  }

  // Safety fallback so updates appear even when payload does not include keys we expect.
  revalidatePath('/sr');
  revalidatePath('/en');
  revalidatePath('/sr/employers');
  revalidatePath('/en/employers');

  return Response.json({
    ok: true,
    revalidated: {
      type: changedType || null,
      slug: changedSlug || null,
      companySlug: changedCompanySlug || null,
    },
  });
}
