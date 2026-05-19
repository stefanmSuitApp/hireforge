import { BriefcaseBusiness, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

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

export function HomeAudiencePaths({ locale, t }: { locale: string; t: Dict }) {
  return (
    <section>
      <div className="mb-12 text-center">
        <h2 className="m-0 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {t.titlePrefix}
          <span className="hf-gradient-text">{t.titleAccent}</span>
        </h2>
        <p className="m-0 mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
        {/* Candidates card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-7" aria-hidden />
            </div>
            <h3 className="m-0 mb-2 text-xl font-bold text-foreground">
              {t.candidatesTitle}
            </h3>
            <p className="m-0 mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t.candidatesBody}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="rounded-full px-6" asChild>
                <Link href="/candidate/login" locale={locale}>
                  {t.candidatesSignIn}
                </Link>
              </Button>
              <Button variant="outline" className="rounded-full px-6" asChild>
                <Link href="/candidate/register" locale={locale}>
                  {t.candidatesRegister}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Employers card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-primary/[0.02] p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/80 to-primary/40" />
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BriefcaseBusiness className="size-7" aria-hidden />
            </div>
            <h3 className="m-0 mb-2 text-xl font-bold text-foreground">
              {t.employersTitle}
            </h3>
            <p className="m-0 mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t.employersBody}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="rounded-full px-6" asChild>
                <Link href="/employer/login" locale={locale}>
                  {t.employersSignIn}
                </Link>
              </Button>
              <Button variant="outline" className="rounded-full px-6" asChild>
                <Link href="/employer/register" locale={locale}>
                  {t.employersRegister}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
