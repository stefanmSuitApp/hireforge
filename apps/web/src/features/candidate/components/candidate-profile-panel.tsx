'use client';

import type { CandidateResumeItem } from 'contracts';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { webHttp } from '@/lib/http/web-axios';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';

type Props = {
  initialFullName: string | null;
  resumes: CandidateResumeItem[];
  resumesError: boolean;
};

export function CandidateProfilePanel({
  initialFullName,
  resumes: initialResumes,
  resumesError,
}: Props) {
  const t = useTranslations('Candidate.profile');
  const tErrors = useTranslations('Errors');
  const [fullName, setFullName] = React.useState(initialFullName ?? '');
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [resumes, setResumes] = React.useState(initialResumes);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function saveName(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await webHttp.patch('/api/candidate/profile', {
        fullName: fullName.trim() || null,
      });
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(f: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', f);
      const { data } = await webHttp.post<CandidateResumeItem>(
        '/api/candidate/resumes',
        fd,
      );
      setResumes((prev) => [data, ...prev]);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    } finally {
      setUploading(false);
    }
  }

  async function removeResume(id: string) {
    setError(null);
    try {
      await webHttp.delete(`/api/candidate/resumes/${id}`);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator));
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t('nameSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fullNameLabel')}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? t('saving') : t('saveName')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t('resumeSection')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('resumeHint')}</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/candidate/cv/build">{t('cvBuildLink')}</Link>
            </Button>
          </div>
          {resumesError ? (
            <p className="mt-2 text-sm text-destructive">{t('resumesLoadError')}</p>
          ) : (
            <>
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('uploadLabel')}
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="text-sm"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void uploadFile(f);
                      }
                    }}
                  />
                  {uploading ? (
                    <span className="text-sm text-muted-foreground">
                      {t('uploading')}
                    </span>
                  ) : null}
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {resumes.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="truncate">{r.originalFilename}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.source === 'generated'
                          ? r.templateCode
                            ? t('resumeGeneratedWithTemplate', {
                                code: r.templateCode,
                              })
                            : t('resumeGenerated')
                          : t('resumeUploaded')}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/candidate/resumes/${r.id}/download`}>
                          {t('download')}
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeResume(r.id)}
                      >
                        {t('delete')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
