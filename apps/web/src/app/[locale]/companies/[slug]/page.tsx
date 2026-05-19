import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { buildCompanyPublicMetadata } from '@/features/companies/lib/company-metadata';
import { PublicCompanyPage } from '@/features/companies/components/public-company-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  return buildCompanyPublicMetadata(params);
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <PublicCompanyPage
      locale={locale}
      slug={slug}
      backHref="/employers"
      backLabelKey="backToEmployers"
    />
  );
}
