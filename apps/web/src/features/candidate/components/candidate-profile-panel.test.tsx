// @vitest-environment jsdom
// The display name: what Save sends, when it is disabled, and that a
// success refreshes the server-rendered account title and header menu.
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messages, renderApp } from '@/test/render';
import { CandidateProfilePanel } from './candidate-profile-panel';

const { patch, refresh } = vi.hoisted(() => ({
  patch: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/http/web-axios', () => ({
  webHttp: {
    patch: (...args: unknown[]) => patch(...args),
  },
}));

const t = messages.Candidate.profile;

beforeEach(() => {
  patch.mockReset();
  refresh.mockReset();
  patch.mockResolvedValue({});
});

function renderPanel(name: string | null = 'Stefan Matić') {
  return renderApp(
    <CandidateProfilePanel
      initialFullName={name}
      resumes={[]}
      resumesError={false}
    />,
  );
}

describe('display name', () => {
  it('explains where the name shows, and Save stays off until it changes', () => {
    renderPanel();
    expect(screen.getByText(t.nameHint)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.saveName })).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('saves the trimmed name and refreshes the account title and menu', async () => {
    const user = userEvent.setup();
    renderPanel();

    const input = screen.getByLabelText(t.fullNameLabel);
    const save = screen.getByRole('button', { name: t.saveName });
    await user.clear(input);
    await user.type(input, '  Ana Anić  ');
    expect(save).toBeEnabled();

    await user.click(save);

    expect(patch).toHaveBeenCalledWith('/api/candidate/profile', {
      fullName: 'Ana Anić',
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(t.nameSaved);
    expect(input).toHaveValue('Ana Anić');
    expect(save).toBeDisabled();
  });

  it('a blank name is stored as no name', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.clear(screen.getByLabelText(t.fullNameLabel));
    await user.click(screen.getByRole('button', { name: t.saveName }));
    expect(patch).toHaveBeenCalledWith('/api/candidate/profile', {
      fullName: null,
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('editing again hides the saved note and allows another save', async () => {
    const user = userEvent.setup();
    renderPanel();
    const input = screen.getByLabelText(t.fullNameLabel);
    await user.clear(input);
    await user.type(input, 'Ana Anić');
    await user.click(screen.getByRole('button', { name: t.saveName }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.type(input, 'ć');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.saveName })).toBeEnabled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('a refusal shows the translated error and does not refresh', async () => {
    patch.mockRejectedValue(
      new AxiosError('bad', '400', undefined, undefined, {
        status: 400,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Check the form',
            requestId: 'r',
          },
        },
      } as AxiosResponse),
    );
    const user = userEvent.setup();
    renderPanel();
    const input = screen.getByLabelText(t.fullNameLabel);
    await user.clear(input);
    await user.type(input, 'Ana');
    await user.click(screen.getByRole('button', { name: t.saveName }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.Errors.VALIDATION_FAILED,
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.saveName })).toBeEnabled();
    expect(input).toHaveValue('Ana');
  });
});
