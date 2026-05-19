import type { Metadata } from 'next';
import { BriefcaseBusiness, UserRound } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { buildLocaleAlternates } from '@/i18n/metadata';
import { routing } from '@/i18n/routing';
import { AuthGatewayEyebrow } from '@/components/auth-form-gateway';
import { AuthPublicGradientShell } from '@/components/auth-public-gradient-shell';
import { AuthStateSync } from '@/components/auth-state-sync';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return {};
  }
  setRequestLocale(locale);
  const t = await getTranslations('SignIn');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildLocaleAlternates(locale, '/sign-in'),
  };
}

export default async function SignInChooserPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  const { returnTo } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('SignIn');
  const navT = await getTranslations('Nav');
  const title = t('title');
  const brand = navT('brand');
  const titleParts = title.split(brand);

  // Build query string for returnTo passthrough
  const returnToQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';

  return (
    <main>
      <AuthStateSync />
      <AuthPublicGradientShell contentClassName="pb-20 md:py-14">
        <section className="relative rounded-3xl border border-border/40 bg-card/70 p-6 backdrop-blur-sm md:p-10">
          <header className="max-w-2xl">
            <AuthGatewayEyebrow>{t('eyebrow')}</AuthGatewayEyebrow>
            <h1 className="mt-3 mb-3 text-[clamp(1.8rem,5.3vw,3rem)] font-extrabold leading-tight tracking-tight text-foreground">
              {titleParts.length > 1 ? (
                <>
                  {titleParts[0]}
                  <span className="hf-gradient-text">{brand}</span>
                  {titleParts.slice(1).join(brand)}
                </>
              ) : (
                title
              )}
            </h1>
            <p className="m-0 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t('subtitle')}
            </p>
          </header>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="flex h-full min-h-[240px] flex-col rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary w-fit">
                <UserRound className="size-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{t('candidateTitle')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('candidateDescription')}
              </p>
              <div className="mt-auto flex flex-col gap-2 pt-6">
                <Button size="lg" className="w-full rounded-full px-5 text-center" asChild>
                  <Link href={`/candidate/login${returnToQuery}`} locale={locale}>
                    {t('candidateSignIn')}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full rounded-full" asChild>
                  <Link href={`/candidate/register${returnToQuery}`} locale={locale}>
                    {t('candidateCreate')}
                  </Link>
                </Button>
              </div>
            </article>

            <article className="flex h-full min-h-[240px] flex-col rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary w-fit">
                <BriefcaseBusiness className="size-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{t('employerTitle')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('employerDescription')}
              </p>
              <div className="mt-auto flex flex-col gap-2 pt-6">
                <Button size="lg" className="w-full rounded-full px-5 text-center" asChild>
                  <Link href={`/employer/login${returnToQuery}`} locale={locale}>
                    {t('employerSignIn')}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full rounded-full" asChild>
                  <Link href={`/employer/register${returnToQuery}`} locale={locale}>
                    {t('employerCreate')}
                  </Link>
                </Button>
              </div>
            </article>
          </div>
        </section>

        <p className="mx-auto mt-10 max-w-md text-center text-xs text-muted-foreground">
          <Link
            href="/"
            locale={locale}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('backHome')}
          </Link>
        </p>
      </AuthPublicGradientShell>
    </main>
  );
}
