import { getTranslations } from 'next-intl/server';

type Props = { status: number };

/** Shown when an RSC fetch to Nest failed but the session may still be valid (e.g. 503). */
export async function StaffNestFetchError({ status }: Props) {
  const t = await getTranslations('Moderator.staffApi');
  const message =
    status === 503
      ? t('unconfigured')
      : t('generic', { status: String(status) });
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm text-destructive" role="alert">
        {message}
      </p>
    </div>
  );
}
