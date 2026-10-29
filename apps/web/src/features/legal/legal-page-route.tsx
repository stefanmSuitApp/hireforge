import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { CmsPortableText } from '@/components/cms-portable-text';
import { PublicSurfaceMain } from '@/components/public-surface';
import { buildPublicPageMetadata } from '@/i18n/metadata';
import { fetchCmsLegalPage, type LegalPageKind } from '@/lib/cms-content';

type Params = Promise<{ locale: string }>;

export async function buildLegalPageMetadata(
  kind: LegalPageKind,
  params: Params,
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Legal');
  const doc = await fetchCmsLegalPage(kind, locale);
  return buildPublicPageMetadata({
    locale,
    path: `/${kind}`,
    title: doc?.title ?? t(`${kind}.title`),
    description: t(`${kind}.description`),
    noindex: !doc,
  });
}

/** Privacy, terms and refunds: CMS text, 404 until it is published. */
export async function LegalPageRoute({
  kind,
  params,
}: {
  kind: LegalPageKind;
  params: Params;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const doc = await fetchCmsLegalPage(kind, locale);
  if (!doc) notFound();
  const t = await getTranslations('Legal');
  const updated = doc.effectiveFrom
    ? new Intl.DateTimeFormat(locale === 'sr' ? 'sr-Latn-RS' : 'en-GB', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(`${doc.effectiveFrom}T00:00:00Z`))
    : null;

  return (
    <PublicSurfaceMain className="pb-20 pt-10 md:pt-14">
      <article className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-h1 text-foreground">{doc.title}</h1>
          {updated ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t('lastUpdated', { date: updated })}
            </p>
          ) : null}
        </header>
        <CmsPortableText value={doc.body} />
      </article>
    </PublicSurfaceMain>
  );
}
