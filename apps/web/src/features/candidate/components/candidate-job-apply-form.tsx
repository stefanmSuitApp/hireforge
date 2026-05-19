'use client';

import type { PublicJobDetailResponse } from 'contracts';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectField, type SelectFieldOption } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Link, useRouter } from '@/i18n/navigation';
import { publicJobUrlSegment } from '@/lib/job-public-segment';
import { webHttp } from '@/lib/http/web-axios';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

const NONE = '__none__';

type Props = {
  job: PublicJobDetailResponse;
  /** When false, submit is blocked (API rejects without verified email). */
  emailVerified?: boolean;
};

export function CandidateJobApplyForm({ job, emailVerified = true }: Props) {
  const t = useTranslations('Candidate.apply');
  const tErrors = useTranslations('Errors');
  const router = useRouter();
  const [coverLetter, setCoverLetter] = React.useState('');
  const [resumeId, setResumeId] = React.useState<string>(NONE);
  const [resumes, setResumes] = React.useState<
    { id: string; originalFilename: string }[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await webHttp.get<
          { id: string; originalFilename: string }[]
        >('/api/candidate/resumes');
        if (!cancelled) {
          setResumes(data);
        }
      } catch {
        if (!cancelled) {
          setResumes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resumeOptions = React.useMemo((): SelectFieldOption[] => {
    const none: SelectFieldOption = { value: NONE, label: t('resumeNone') };
    return [
      none,
      ...resumes.map((r) => ({
        value: r.id,
        label: r.originalFilename,
      })),
    ];
  }, [resumes, t]);

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!emailVerified) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await webHttp.post('/api/candidate/applications', {
        jobId: job.id,
        coverLetterText: coverLetter.trim() || undefined,
        resumeAssetId: resumeId && resumeId !== NONE ? resumeId : undefined,
      });
      router.replace('/candidate/applications');
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">{job.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{job.company.name}</p>
      </div>

      {emailVerified === false ? (
        <div
          role="alert"
          className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm"
        >
          <p className="font-medium text-foreground">
            {t('emailNotVerifiedTitle')}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t('emailNotVerifiedLead')}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="cover">{t('coverLabel')}</Label>
            <Textarea
              id="cover"
              rows={7}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder={t('coverPlaceholder')}
              className="min-h-[140px] resize-y"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <Label>{t('resumeLabel')}</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('resumeLoading')}</p>
            ) : (
              <SelectField
                value={resumeId}
                onValueChange={setResumeId}
                options={resumeOptions}
                placeholder={t('resumePlaceholder')}
              />
            )}
            <p className="text-xs text-muted-foreground">{t('resumeHint')}</p>
            <Link
              href="/candidate/profile"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('manageResumesLink')}
            </Link>
          </div>
        </section>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting || !emailVerified}>
          {submitting ? t('submitting') : t('submit')}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/jobs/${publicJobUrlSegment(job)}`}>{t('cancel')}</Link>
        </Button>
      </div>
    </form>
  );
}
