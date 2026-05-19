import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export async function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="w-full flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
