import { BriefcaseBusiness, Gift, UserRound } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

type Dict = {
  titlePrefix: string;
  titleAccent: string;
  subtitle: string;
  candidatesTitle: string;
  candidatesBody: string;
  candidatesSignIn: string;
  candidatesRegister: string;
  employersTitle: string;
  employersBody: string;
  employersSignIn: string;
  employersRegister: string;
};

const pill =
  'hf-press inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-bold no-underline';

export function HomeAudiencePaths({
  locale,
  t,
  promo,
}: {
  locale: string;
  t: Dict;
  /** A running campaign's line, repeated where employers decide. */
  promo?: string | null;
}) {
  return (
    <section>
      <div className="mb-10 text-center">
        <h2 className="m-0 text-3xl font-extrabold tracking-tight text-foreground md:text-[2.125rem]">
          {t.titlePrefix}
          <span className="text-primary">{t.titleAccent}</span>
        </h2>
        <p className="m-0 mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          {t.subtitle}
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="hf-lift hf-reveal rounded-[28px] bg-primary p-9 text-primary-foreground">
          <UserRound className="size-8 opacity-90" aria-hidden />
          <h3 className="m-0 mt-4 text-[1.75rem] font-extrabold">
            {t.candidatesTitle}
          </h3>
          <p className="m-0 mt-3 max-w-md leading-relaxed opacity-90">
            {t.candidatesBody}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/candidate/register"
              locale={locale}
              className={cn(pill, 'bg-primary-foreground text-primary')}
            >
              {t.candidatesRegister}
            </Link>
            <Link
              href="/candidate/login"
              locale={locale}
              className={cn(
                pill,
                'border border-primary-foreground/60 text-primary-foreground',
              )}
            >
              {t.candidatesSignIn}
            </Link>
          </div>
        </div>

        <div className="hf-lift hf-reveal rounded-[28px] bg-featured p-9 text-featured-foreground">
          <BriefcaseBusiness className="size-8 opacity-90" aria-hidden />
          <h3 className="m-0 mt-4 text-[1.75rem] font-extrabold">
            {t.employersTitle}
          </h3>
          <p className="m-0 mt-3 max-w-md leading-relaxed opacity-90">
            {t.employersBody}
          </p>
          {promo ? (
            <p className="m-0 mt-4 inline-flex items-center gap-2 rounded-xl bg-featured-foreground px-3 py-2 text-sm font-bold text-featured">
              <Gift className="size-4" aria-hidden />
              {promo}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/employer/register"
              locale={locale}
              className={cn(pill, 'bg-featured-foreground text-featured')}
            >
              {t.employersRegister}
            </Link>
            <Link
              href="/employer/login"
              locale={locale}
              className={cn(
                pill,
                'border border-featured-foreground/50 text-featured-foreground',
              )}
            >
              {t.employersSignIn}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
