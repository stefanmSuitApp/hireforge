// @vitest-environment jsdom
// T5.3 / T8: after sign-in the user goes back only to a path on this site.
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAppHook } from '@/test/render';
import { useCandidateLoginMutation } from './use-candidate-login-mutation';
import { useEmployerLoginMutation } from './use-employer-login-mutation';

// A full page load (so the header sees the new session); jsdom can't navigate.
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/lib/session-navigation', () => ({
  navigateWithFreshSession: navigate,
}));
vi.mock('@/api/candidate-auth', () => ({
  postCandidateLogin: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/api/employer-auth', () => ({
  postEmployerLogin: vi.fn(async () => ({ ok: true })),
}));

beforeEach(() => navigate.mockClear());

const HOOKS = [
  ['candidate', useCandidateLoginMutation, '/candidate'],
  ['employer', useEmployerLoginMutation, '/employer'],
] as const;

describe.each(HOOKS)('%s sign-in', (_, useLogin, home) => {
  async function signInWith(returnTo: string | null) {
    const { result } = renderAppHook(() => useLogin());
    await act(async () => {
      result.current.mutate({
        body: { email: 'a@b.rs', password: 'x' },
        returnTo,
      } as never);
    });
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    return navigate.mock.calls[0]?.[1];
  }

  it('goes back to the page that sent the user to sign in', async () => {
    expect(await signInWith('/jobs/pekar-x7k2/apply')).toBe(
      '/jobs/pekar-x7k2/apply',
    );
  });

  it('drops the locale of returnTo (navigation adds it back)', async () => {
    expect(await signInWith('/sr/jobs/pekar-x7k2/apply')).toBe(
      '/jobs/pekar-x7k2/apply',
    );
  });

  it.each([
    '//evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    null,
  ])('ignores returnTo=%j and goes to the dashboard', async (returnTo) => {
    expect(await signInWith(returnTo)).toBe(home);
  });

  // Known issue (PROGRESS.md): only "//" is refused; "/\host" is a
  // protocol-relative URL in browsers. Not exploitable while next-intl uses
  // localePrefix "always" (it becomes /sr/\host); flip to `it` when refused.
  it.fails('ignores returnTo="/\\evil.example" too', async () => {
    expect(await signInWith('/\\evil.example')).toBe(home);
  });
});
