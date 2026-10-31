import { redirect } from 'next/navigation';

import { isUuidString } from '@/lib/job-public-segment';

/** The owner change moved onto the moderator company page (admins only). */
export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; companyId: string }>;
}) {
  const { locale, companyId } = await params;
  redirect(
    isUuidString(companyId)
      ? `/${locale}/moderator/companies/${companyId}`
      : `/${locale}/moderator/companies`,
  );
}
