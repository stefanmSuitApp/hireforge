'use client';

import { createContext, useContext, type ReactNode } from 'react';

const CompanyLogosContext = createContext<Record<string, string>>({});

/** Company logos (slug → URL: uploaded, else Sanity's), loaded once in the layout. */
export function CompanyLogosProvider({
  logos,
  children,
}: {
  logos: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <CompanyLogosContext.Provider value={logos}>
      {children}
    </CompanyLogosContext.Provider>
  );
}

export function useCompanyLogo(slug: string | undefined): string | null {
  const logos = useContext(CompanyLogosContext);
  return slug ? (logos[slug] ?? null) : null;
}
