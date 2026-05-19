import { setRequestLocale } from 'next-intl/server';

import { StaffNestFetchError } from '@/components/staff-nest-fetch-error';
import { ModeratorQueue } from '@/features/moderator';
import { fetchModeratorQueue } from '@/lib/fetch-moderator';
import { loadModeratorSessionOrRedirect } from '@/lib/moderator-workspace-load';
import { redirectToModeratorLoginIfUnauthorized } from '@/lib/staff-server-fetch-guard';

const QUEUE_STATUSES = new Set([
  'draft',
  'submitted',
  'published',
  'rejected',
  'archived',
  'expired',
]);

export default async function ModeratorDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; limit?: string; offset?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const { accessToken } = await loadModeratorSessionOrRedirect();
  const qs = new URLSearchParams();
  const rawStatus = sp.status?.trim();
  if (rawStatus && QUEUE_STATUSES.has(rawStatus)) {
    qs.set('status', rawStatus);
  }
  if (sp.limit?.trim()) qs.set('limit', sp.limit.trim());
  if (sp.offset?.trim()) qs.set('offset', sp.offset.trim());

  const queue = await fetchModeratorQueue(accessToken, qs.toString());
  if (!queue.ok) {
    redirectToModeratorLoginIfUnauthorized(locale, queue.status);
    return <StaffNestFetchError status={queue.status} />;
  }

  const initialStatus =
    rawStatus && QUEUE_STATUSES.has(rawStatus) ? rawStatus : 'submitted';

  return <ModeratorQueue queue={queue.data} initialStatus={initialStatus} />;
}
