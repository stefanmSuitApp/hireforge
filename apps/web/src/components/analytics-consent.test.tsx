// @vitest-environment jsdom
// Clarity loads only after "Prihvatam", only on public pages, and a private
// page reached by client navigation is masked from recordings.
import '@testing-library/jest-dom/vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LegalLinksProvider } from '@/features/legal/legal-links';
import { renderApp } from '@/test/render';

import {
  AnalyticsConsentBanner,
  AnalyticsConsentSettingsButton,
} from './analytics-consent';

const nav = vi.hoisted(() => ({ pathname: '/jobs' }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => nav.pathname,
}));

const clarityScripts = () =>
  document.querySelectorAll('script[src^="https://www.clarity.ms/tag/"]');

const banner = () =>
  screen.queryByRole('complementary', { name: 'Kolačići za analitiku' });

function renderBanner(initialChoice: 'granted' | 'denied' | null = null) {
  return renderApp(
    <LegalLinksProvider published={['privacy']}>
      <AnalyticsConsentBanner
        projectId="e2eclarity1"
        initialChoice={initialChoice}
      />
      <AnalyticsConsentSettingsButton />
    </LegalLinksProvider>,
  );
}

beforeEach(() => {
  nav.pathname = '/jobs';
});

afterEach(() => {
  for (const s of clarityScripts()) s.remove();
  delete window.clarity;
  document.body.removeAttribute('data-clarity-mask');
  document.cookie = 'hf_analytics_consent=; Path=/; Max-Age=0';
});

describe('analytics consent', () => {
  it('loads nothing until the visitor accepts', async () => {
    renderBanner();
    expect(banner()).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Više u politici privatnosti.' }),
    ).toHaveAttribute('href', '/privacy');
    expect(clarityScripts()).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Prihvatam' }));

    expect(banner()).not.toBeInTheDocument();
    expect(clarityScripts()).toHaveLength(1);
    expect(clarityScripts()[0]).toHaveAttribute(
      'src',
      'https://www.clarity.ms/tag/e2eclarity1',
    );
    expect(window.clarity?.q).toContainEqual([
      'consentv2',
      { ad_Storage: 'denied', analytics_Storage: 'granted' },
    ]);
    expect(document.cookie).toContain('hf_analytics_consent=granted');
  });

  it('declining remembers the choice and never loads Clarity', async () => {
    renderBanner();
    await userEvent.click(screen.getByRole('button', { name: 'Odbijam' }));
    expect(banner()).not.toBeInTheDocument();
    expect(clarityScripts()).toHaveLength(0);
    expect(document.cookie).toContain('hf_analytics_consent=denied');
  });

  it('a returning visitor who accepted is not asked again', () => {
    renderBanner('granted');
    expect(banner()).not.toBeInTheDocument();
    expect(clarityScripts()).toHaveLength(1);
  });

  it('never asks or loads on private pages, and masks them', () => {
    nav.pathname = '/employer/jobs/new';
    renderBanner('granted');
    expect(banner()).not.toBeInTheDocument();
    expect(clarityScripts()).toHaveLength(0);
    expect(document.body).toHaveAttribute('data-clarity-mask', 'true');
  });

  it('masks a private page reached by client navigation after accepting', () => {
    const view = renderBanner('granted');
    expect(document.body).not.toHaveAttribute('data-clarity-mask');
    nav.pathname = '/candidate/profile';
    view.rerender(
      <LegalLinksProvider published={['privacy']}>
        <AnalyticsConsentBanner
          projectId="e2eclarity1"
          initialChoice="granted"
        />
      </LegalLinksProvider>,
    );
    expect(document.body).toHaveAttribute('data-clarity-mask', 'true');
    expect(window.clarity?.q).toContainEqual(['pause']);
  });

  it('the footer link reopens the banner to change the choice', async () => {
    renderBanner('denied');
    expect(banner()).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Podešavanja kolačića' }),
    );
    expect(banner()).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Prihvatam' }));
    expect(clarityScripts()).toHaveLength(1);
  });

  it('withdrawing consent clears Clarity cookies and reloads without it', async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      protocol: 'http:',
      hostname: 'localhost',
      reload,
    });
    document.cookie = '_clck=abc; Path=/';
    renderBanner('granted');
    await act(async () => {
      globalThis.dispatchEvent(new Event('hf:analytics-consent:open'));
    });
    await userEvent.click(screen.getByRole('button', { name: 'Odbijam' }));
    expect(document.cookie).not.toContain('_clck=');
    expect(document.cookie).toContain('hf_analytics_consent=denied');
    expect(reload).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
