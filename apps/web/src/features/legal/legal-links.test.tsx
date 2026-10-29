// @vitest-environment jsdom
// C1: the sign-up and checkout notices link to legal pages only once those
// pages are published, so nothing ever points at a 404.
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { LegalPageKind } from '@/lib/cms-content';
import { renderApp } from '@/test/render';
import {
  CheckoutLegalNotice,
  LegalLinksProvider,
  SignUpLegalNotice,
} from './legal-links';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const renderWith = (published: LegalPageKind[]) =>
  renderApp(
    <LegalLinksProvider published={published}>
      <SignUpLegalNotice />
      <CheckoutLegalNotice />
    </LegalLinksProvider>,
  );

describe('legal notices', () => {
  it('link to the published terms, privacy and refund pages', () => {
    renderWith(['privacy', 'terms', 'refunds']);
    expect(
      screen.getByRole('link', { name: 'Uslove korišćenja' }),
    ).toHaveAttribute('href', '/terms');
    expect(
      screen.getByRole('link', { name: 'Politika privatnosti' }),
    ).toHaveAttribute('href', '/privacy');
    expect(
      screen.getByRole('link', { name: 'pravila o povraćaju novca' }),
    ).toHaveAttribute('href', '/refunds');
  });

  it('show nothing while a page they link to is unpublished', () => {
    renderWith(['terms']);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
