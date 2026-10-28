// @vitest-environment jsdom
// T5.4 package checkout: what the Buy button sends (package, duration,
// currency, promo code), where it goes, and how refusals are shown.
import '@testing-library/jest-dom/vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import type { EmployerPackageCatalogItem } from 'contracts';
import { entitlementsBlobFallbackTezgaBaseline } from 'contracts';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messages, renderApp } from '@/test/render';
import { EmployerPackagesPanel } from './employer-packages-panel';

const { push, post } = vi.hoisted(() => ({ push: vi.fn(), post: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/lib/http/web-axios', () => ({
  webHttp: { post: (...a: unknown[]) => post(...a) },
}));

const t = messages.Employer.packages;
const COMPANY = '30ff897a-bd6e-4e98-871a-69baf000ee37';
const pkg = (code: string, isEnterprise = false) =>
  ({
    code,
    isEnterprise,
    titleSr: code.toUpperCase(),
    // The catalogue API never sends a package without prices (employer.service skips them).
    prices: [{ durationDays: 30, amountMinor: 3700, currency: 'EUR' }],
    entitlements: entitlementsBlobFallbackTezgaBaseline,
    upgradeMessages: [],
  }) as unknown as EmployerPackageCatalogItem;

beforeEach(() => {
  push.mockReset();
  post.mockReset().mockResolvedValue({
    data: { subscription: { id: 's-1' }, proforma: { id: 'pf-1' } },
  });
});

describe('buying a package', () => {
  it('buys the package for my company and opens the proforma', async () => {
    renderApp(
      <EmployerPackagesPanel
        companyId={COMPANY}
        emailVerified
        items={[pkg('tezga')]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: t.subscribe }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/employer/billing/proforma/pf-1'),
    );
    expect(post).toHaveBeenCalledWith('/api/employer/subscriptions', {
      companyId: COMPANY,
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
    });
  });

  it('sends a promo code upper-cased and trimmed', async () => {
    renderApp(
      <EmployerPackagesPanel
        companyId={COMPANY}
        emailVerified
        items={[pkg('tezga')]}
      />,
    );
    await userEvent.type(screen.getByLabelText(t.promoLabel), ' leto-26 ');
    await userEvent.click(screen.getByRole('button', { name: t.subscribe }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0]?.[1]).toMatchObject({ promoCode: 'LETO-26' });
  });

  it('a promo shorter than 4 characters is not sent', async () => {
    renderApp(
      <EmployerPackagesPanel
        companyId={COMPANY}
        emailVerified
        items={[pkg('tezga')]}
      />,
    );
    await userEvent.type(screen.getByLabelText(t.promoLabel), 'ab');
    await userEvent.click(screen.getByRole('button', { name: t.subscribe }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('promoCode');
  });

  it('a refused promo shows its translated error', async () => {
    post.mockRejectedValue(
      new AxiosError('bad', '400', undefined, undefined, {
        status: 400,
        data: {
          error: {
            code: 'PROMO_CODE_INVALID',
            message: 'Unknown',
            requestId: 'r',
          },
        },
      } as AxiosResponse),
    );
    renderApp(
      <EmployerPackagesPanel
        companyId={COMPANY}
        emailVerified
        items={[pkg('tezga')]}
      />,
    );
    await userEvent.type(screen.getByLabelText(t.promoLabel), 'NEPOSTOJI');
    await userEvent.click(screen.getByRole('button', { name: t.subscribe }));
    expect(
      await screen.findByText(messages.Errors.PROMO_CODE_INVALID),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('without a verified email nothing can be bought', async () => {
    renderApp(
      <EmployerPackagesPanel
        companyId={COMPANY}
        emailVerified={false}
        items={[pkg('tezga')]}
      />,
    );
    expect(screen.getByRole('button', { name: t.subscribe })).toBeDisabled();
    expect(screen.getAllByText(t.verifyToPurchase).length).toBeGreaterThan(0);
  });

  it('GAZDA (enterprise) is not sold here', () => {
    renderApp(
      <EmployerPackagesPanel
        companyId={COMPANY}
        emailVerified
        items={[pkg('gazda', true)]}
      />,
    );
    expect(
      screen.getByRole('button', { name: t.enterpriseCta }),
    ).toBeDisabled();
  });
});
