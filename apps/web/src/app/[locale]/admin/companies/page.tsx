import { redirect } from 'next/navigation';

/** Admins work companies on the moderator screens (old links land there). */
export default async function AdminCompaniesListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/moderator/companies`);
}
