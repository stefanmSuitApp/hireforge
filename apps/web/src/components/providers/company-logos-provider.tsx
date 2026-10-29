'use client';

import { createContext, useContext, type ReactNode } from 'react';

const CompanyLogosContext = createContext<Record<string, string>>({});

/** Logos from CMS (slug → URL), loaded once in the layout for every page. */
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
