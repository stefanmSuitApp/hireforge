'use client';

import type { ModeratorJobDetailResponse } from 'contracts';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import {
  jobListingStatusTone,
  TableStatusBadge,
} from '@/components/table-status-badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui';
import {
  JobListingPreview,
  moderatorJobToPublicPreviewShape,
} from '@/features/jobs';
import {
  useAdminForceArchiveMutation,
  useModeratorPublishDirectMutation,
  useModeratorPublishMutation,
  useModeratorRejectMutation,
  useModeratorUnpublishMutation,
} from '@/hooks/mutations';
import { useModeratorJobQuery } from '@/hooks/queries';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { Link } from '@/i18n/navigation';
import { publicJobUrlSegment } from '@/lib/job-public-segment';

type Props = {
  job: ModeratorJobDetailResponse;
  jobId: string;
  /** Platform admin override: archive from any status. */
  isAdmin?: boolean;
};

export function ModeratorJobReview({ job, jobId, isAdmin = false }: Props) {
  const locale = useLocale();
  const t = useTranslations('Moderator.review');
  const tStatus = useTranslations('Employer.jobStatus');
  const tErrors = useTranslations('Errors');
  const [rejectReason, setRejectReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [rawOpen, setRawOpen] = React.useState(false);
  const jobQuery = useModeratorJobQuery(jobId, job);

  const publishMut = useModeratorPublishMutation(jobId);
  const publishDirectMut = useModeratorPublishDirectMutation(jobId);
  const rejectMut = useModeratorRejectMutation(jobId);
  const unpublishMut = useModeratorUnpublishMutation(jobId);
  const forceArchiveMut = useAdminForceArchiveMutation(jobId);
  const currentJob = jobQuery.data;

  const pending =
    publishMut.isPending ||
    publishDirectMut.isPending ||
    rejectMut.isPending ||
    unpublishMut.isPending ||
    forceArchiveMut.isPending;

  const previewJob = moderatorJobToPublicPreviewShape(currentJob);
  const listingState =
    currentJob.status === 'published'
      ? ('live' as const)
      : ('preview' as const);

  const canStaffEdit =
    currentJob.status === 'draft' ||
    currentJob.status === 'submitted' ||
    currentJob.status === 'published';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/moderator" locale={locale}>
            {t('backToQueue')}
          </Link>
        </Button>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {currentJob.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentJob.company.legalName}{' '}
          <span className="font-mono">({currentJob.company.slug})</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <TableStatusBadge
            label={tStatus(
              currentJob.status as
                | 'draft'
                | 'submitted'
                | 'published'
                | 'rejected'
                | 'archived'
                | 'expired',
            )}
            tone={jobListingStatusTone(currentJob.status)}
          />
          {canStaffEdit ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/moderator/jobs/${jobId}/edit`} locale={locale}>
                {t('editListing')}
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-start">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {t('candidatePreviewTitle')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t('candidatePreviewHint')}
          </p>
          <JobListingPreview
            job={previewJob}
            listingState={listingState}
            className="shadow-sm"
          />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          {currentJob.status === 'published' ? (
            <p>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/jobs/${publicJobUrlSegment(currentJob)}`}
                  locale={locale}
                >
                  {t('publicListing')}
                </Link>
              </Button>
            </p>
          ) : null}

          <div className="rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left font-medium text-foreground"
              onClick={() => setRawOpen((o) => !o)}
            >
              {t('rawFieldsTitle')}
              <span className="text-xs font-normal text-muted-foreground">
                {rawOpen ? t('rawFieldsToggleHide') : t('rawFieldsToggleShow')}
              </span>
            </button>
            {rawOpen ? (
              <dl className="mt-3 space-y-2 font-mono text-xs text-muted-foreground">
                <div>
                  <dt className="text-foreground">job id</dt>
                  <dd>{currentJob.id}</dd>
                </div>
                <div>
                  <dt className="text-foreground">company id</dt>
                  <dd>{currentJob.company.id}</dd>
                </div>
                <div>
                  <dt className="text-foreground">slug / shortId</dt>
                  <dd>
                    {currentJob.slug ?? '—'} / {currentJob.shortId ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground">primaryLanguage</dt>
                  <dd>{currentJob.primaryLanguage}</dd>
                </div>
                <div>
                  <dt className="text-foreground">city</dt>
                  <dd>{currentJob.city?.slug ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-foreground">category</dt>
                  <dd>{currentJob.category?.slug ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-foreground">updatedAt</dt>
                  <dd>{currentJob.updatedAt}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-6 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            {currentJob.status === 'draft' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      publishDirectMut.mutate(undefined, {
                        onError: (err) =>
                          setError(
                            getTranslatedApiErrorMessage(
                              err,
                              tErrors as ErrorsTranslator,
                            ),
                          ),
                      });
                    }}
                  >
                    {publishDirectMut.isPending
                      ? t('publishingDirect')
                      : t('publishDirect')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground max-w-prose">
                  {t('publishDirectHint')}
                </p>
              </div>
            ) : null}

            {currentJob.status === 'submitted' ? (
              <>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      publishMut.mutate(undefined, {
                        onError: (err) =>
                          setError(
                            getTranslatedApiErrorMessage(
                              err,
                              tErrors as ErrorsTranslator,
                            ),
                          ),
                      });
                    }}
                  >
                    {publishMut.isPending ? t('publishing') : t('publish')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      publishDirectMut.mutate(undefined, {
                        onError: (err) =>
                          setError(
                            getTranslatedApiErrorMessage(
                              err,
                              tErrors as ErrorsTranslator,
                            ),
                          ),
                      });
                    }}
                  >
                    {publishDirectMut.isPending
                      ? t('publishingDirect')
                      : t('publishDirect')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground max-w-prose">
                  {t('publishDirectHint')}
                </p>
                <div className="space-y-2 max-w-xl">
                  <Label htmlFor="reject-reason">{t('rejectReason')}</Label>
                  <Input
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('rejectPlaceholder')}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending || !rejectReason.trim()}
                    onClick={() => {
                      setError(null);
                      rejectMut.mutate(
                        { reason: rejectReason.trim() },
                        {
                          onError: (err) =>
                            setError(
                              getTranslatedApiErrorMessage(
                                err,
                                tErrors as ErrorsTranslator,
                              ),
                            ),
                        },
                      );
                    }}
                  >
                    {rejectMut.isPending ? t('rejecting') : t('reject')}
                  </Button>
                </div>
              </>
            ) : null}

            {currentJob.status === 'published' ? (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    unpublishMut.mutate(undefined, {
                      onError: (err) =>
                        setError(
                          getTranslatedApiErrorMessage(
                            err,
                            tErrors as ErrorsTranslator,
                          ),
                        ),
                    });
                  }}
                >
                  {unpublishMut.isPending ? t('unpublishing') : t('unpublish')}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('unpublishHint')}
                </p>
              </div>
            ) : null}

            {currentJob.status === 'rejected' ||
            currentJob.status === 'archived' ||
            currentJob.status === 'expired' ? (
              <p className="text-sm text-muted-foreground">{t('noActions')}</p>
            ) : null}

            {isAdmin ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <h3 className="text-sm font-medium text-foreground">
                  {t('adminOverrideTitle')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('adminOverrideHint')}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="mt-3"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    forceArchiveMut.mutate(undefined, {
                      onError: (err) =>
                        setError(
                          getTranslatedApiErrorMessage(
                            err,
                            tErrors as ErrorsTranslator,
                          ),
                        ),
                    });
                  }}
                >
                  {forceArchiveMut.isPending
                    ? t('forceArchiving')
                    : t('forceArchive')}
                </Button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
