// @vitest-environment jsdom
// Clarity and Google Analytics load only after "Prihvatam", only on public
// pages, and a private page reached by client navigation is masked from
// recordings and sends nothing to Google.
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
const gaScripts = () =>
  document.querySelectorAll(
    'script[src^="https://www.googletagmanager.com/gtag/js"]',
  );
/** gtag pushes `arguments` objects; compare them as arrays. */
const gtagCalls = () =>
  (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
const GA_ID = 'G-E2ETEST01';
const gaDisabled = () =>
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`];

const banner = () =>
  screen.queryByRole('complementary', { name: 'Kolačići za analitiku' });

function renderBanner(initialChoice: 'granted' | 'denied' | null = null) {
  return renderApp(
    <LegalLinksProvider published={['privacy']}>
      <AnalyticsConsentBanner
        clarityId="e2eclarity1"
        gaId={GA_ID}
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
  for (const s of [...clarityScripts(), ...gaScripts()]) s.remove();
  delete window.clarity;
  delete window.gtag;
  delete window.dataLayer;
  document.body.removeAttribute('data-clarity-mask');
  document.cookie = 'hf_analytics_consent=; Path=/; Max-Age=0';
});

describe('analytics consent', () => {
  it('loads nothing until the visitor accepts', async () => {
    renderBanner();
    expect(banner()).toBeInTheDocument();
    expect(banner()).toHaveTextContent(
      'koristimo Google Analytics i Microsoft Clarity:',
    );
    expect(
      screen.getByRole('link', { name: 'Više u politici privatnosti.' }),
    ).toHaveAttribute('href', '/privacy');
    expect(clarityScripts()).toHaveLength(0);
    expect(gaScripts()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();

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
    expect(gaScripts()[0]).toHaveAttribute(
      'src',
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
    );
    expect(gtagCalls()).toContainEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
      },
    ]);
    expect(gtagCalls()).toContainEqual([
      'config',
      GA_ID,
      {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    ]);
    expect(
      gtagCalls().filter((c) => c[0] === 'event' && c[1] === 'page_view'),
    ).toHaveLength(1);
    expect(document.cookie).toContain('hf_analytics_consent=granted');
  });

  it('declining remembers the choice and never loads either tool', async () => {
    renderBanner();
    await userEvent.click(screen.getByRole('button', { name: 'Odbijam' }));
    expect(banner()).not.toBeInTheDocument();
    expect(clarityScripts()).toHaveLength(0);
    expect(gaScripts()).toHaveLength(0);
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
    expect(gaScripts()).toHaveLength(0);
    expect(document.body).toHaveAttribute('data-clarity-mask', 'true');
  });

  it('a private page reached by client navigation is masked and not sent to Google', () => {
    const view = renderBanner('granted');
    const pageViews = () =>
      gtagCalls().filter((c) => c[0] === 'event' && c[1] === 'page_view');
    expect(document.body).not.toHaveAttribute('data-clarity-mask');
    expect(gaDisabled()).toBe(false);
    expect(pageViews()).toHaveLength(1);

    const rerender = () =>
      view.rerender(
        <LegalLinksProvider published={['privacy']}>
          <AnalyticsConsentBanner
            clarityId="e2eclarity1"
            gaId={GA_ID}
            initialChoice="granted"
          />
        </LegalLinksProvider>,
      );
    nav.pathname = '/candidate/profile';
    rerender();
    expect(document.body).toHaveAttribute('data-clarity-mask', 'true');
    expect(window.clarity?.q).toContainEqual(['pause']);
    expect(gaDisabled()).toBe(true);
    expect(pageViews()).toHaveLength(1);

    nav.pathname = '/jobs/city/beograd';
    rerender();
    expect(gaDisabled()).toBe(false);
    expect(pageViews()).toHaveLength(2);
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

  it("withdrawing consent clears both tools' cookies and reloads without them", async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      protocol: 'http:',
      hostname: 'localhost',
      reload,
    });
    document.cookie = '_clck=abc; Path=/';
    document.cookie = '_ga=GA1.1.1; Path=/';
    document.cookie = '_ga_E2ETEST01=GS1.1; Path=/';
    renderBanner('granted');
    await act(async () => {
      globalThis.dispatchEvent(new Event('hf:analytics-consent:open'));
    });
    await userEvent.click(screen.getByRole('button', { name: 'Odbijam' }));
    expect(document.cookie).not.toContain('_clck=');
    expect(document.cookie).not.toContain('_ga');
    expect(document.cookie).toContain('hf_analytics_consent=denied');
    expect(reload).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
