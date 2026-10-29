// @vitest-environment jsdom
// E: with no live job anywhere, visitors get a next step instead of
// "change your filters"; employers first, since nothing happens until one posts.
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { SiteLaunchPanel } from './site-launch-panel';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const link = (name: string) => screen.getByRole('link', { name });

describe('SiteLaunchPanel', () => {
  it('sends a guest to post the first job or to sign up as a candidate', () => {
    renderApp(<SiteLaunchPanel viewer={null} variant="jobs" />);
    expect(
      screen.getByRole('heading', { name: 'Šljakam tek počinje' }),
    ).toBeVisible();
    expect(link('Objavi prvi oglas')).toHaveAttribute(
      'href',
      '/employer/register',
    );
    expect(link('Napravi nalog kandidata')).toHaveAttribute(
      'href',
      '/candidate/register',
    );
  });

  it('takes a signed-in employer to their dashboard', () => {
    renderApp(<SiteLaunchPanel viewer="employer" variant="home" />);
    expect(
      screen.getByRole('heading', { name: 'Budi među prvim poslodavcima' }),
    ).toBeVisible();
    expect(link('Objavi prvi oglas')).toHaveAttribute('href', '/employer');
  });

  it('asks a candidate to get their CV ready', () => {
    renderApp(<SiteLaunchPanel viewer="candidate" variant="jobs" />);
    expect(link('Pripremi profil i CV')).toHaveAttribute(
      'href',
      '/candidate/profile',
    );
    expect(screen.queryByText('Objavi prvi oglas')).not.toBeInTheDocument();
  });
});
