'use client';

import { useTranslations } from 'next-intl';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { CandidateRegisterForm } from '@/features/candidate/components/candidate-register-form';
import { Link } from '@/i18n/navigation';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  companyName: string;
  /** Locale-less apply path, e.g. `/jobs/<slug>/apply`. */
  applyPath: string;
};

/** "Konkuriši" for a guest: sign up over the job instead of leaving it. */
export function GuestApplySheet({
  open,
  onOpenChange,
  jobTitle,
  companyName,
  applyPath,
}: Props) {
  const t = useTranslations('JobDetail');
  const returnTo = encodeURIComponent(applyPath);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel={t('applySheetClose')}
        className="mx-auto w-full max-w-lg sm:bottom-4 sm:rounded-2xl sm:border"
      >
        <div className="pr-12">
          <SheetTitle>{t('applySheetTitle')}</SheetTitle>
          <p className="m-0 mt-1 text-sm font-medium text-foreground">
            {jobTitle} · {companyName}
          </p>
        </div>
        <SheetDescription className="m-0 text-sm text-muted-foreground">
          {t('applySheetBody')}
        </SheetDescription>
        <CandidateRegisterForm returnTo={applyPath} />
        <p className="m-0 text-center text-sm text-muted-foreground">
          {t('applyHaveAccount')}{' '}
          <Link
            href={`/candidate/login?returnTo=${returnTo}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('applySignIn')}
          </Link>
        </p>
      </SheetContent>
    </Sheet>
  );
}
