'use client';

import './global.css';

import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import enMessages from '@/messages/en.json';
import srMessages from '@/messages/sr.json';

function getLocaleFromPathname(pathname: string | null): 'en' | 'sr' {
  if (pathname?.startsWith('/en')) {
    return 'en';
  }

  return 'sr';
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy =
    locale === 'en' ? enMessages.GlobalError : srMessages.GlobalError;

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-neutral-50 font-sans text-gray-900 antialiased">
        <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
          <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
          <Button
            variant="outline"
            type="button"
            className="w-fit"
            onClick={() => reset()}
          >
            {copy.retry}
          </Button>
        </main>
      </body>
    </html>
  );
}
