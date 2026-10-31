'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { Button, Label, Switch } from '@/components/ui';
import {
  getTranslatedApiErrorMessage,
  type ErrorsTranslator,
} from '@/lib/http/api-error-message';
import { webHttp } from '@/lib/http/web-axios';

/** URL of the candidate's photo; `version` changes after each upload. */
export function cvPhotoUrl(version: number): string {
  return `/api/candidate/photo?v=${version}`;
}

/**
 * CV photo in the builder: uploads right away (the API stores a 600×600
 * JPEG), shows it, removes it, and the "show on the CV" switch.
 */
export function CvPhotoField({
  hasPhoto,
  version,
  onPhotoChange,
  showPhoto,
  onShowPhotoChange,
}: {
  hasPhoto: boolean;
  version: number;
  onPhotoChange: (hasPhoto: boolean) => void;
  showPhoto: boolean;
  onShowPhotoChange: (show: boolean) => void;
}) {
  const t = useTranslations('Candidate.cvBuild');
  const tErrors = useTranslations('Errors');
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  async function run(action: () => Promise<unknown>, nowHas: boolean) {
    setBusy(true);
    try {
      await action();
      onPhotoChange(nowHas);
    } catch (err) {
      toast.error(
        getTranslatedApiErrorMessage(err, tErrors as ErrorsTranslator),
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  function upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    void run(() => webHttp.post('/api/candidate/photo', body), true);
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{t('photoTitle')}</h4>
      <div className="flex flex-wrap items-center gap-4">
        {hasPhoto ? (
          <img
            src={cvPhotoUrl(version)}
            alt={t('photoAlt')}
            className="size-20 rounded-full border border-border object-cover"
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id="cv-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-describedby="cv-photo-hint"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy
              ? t('photoUploading')
              : hasPhoto
                ? t('photoReplace')
                : t('photoUpload')}
          </Button>
          {hasPhoto ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(() => webHttp.delete('/api/candidate/photo'), false)
              }
            >
              {t('photoRemove')}
            </Button>
          ) : null}
        </div>
      </div>
      <p id="cv-photo-hint" className="text-xs text-muted-foreground">
        {t('photoHint')}
      </p>
      {hasPhoto ? (
        <div className="flex items-center gap-3">
          <Switch
            id="cv-show-photo"
            checked={showPhoto}
            onCheckedChange={onShowPhotoChange}
          />
          <Label htmlFor="cv-show-photo">{t('showPhoto')}</Label>
        </div>
      ) : null}
    </div>
  );
}
