// @vitest-environment jsdom
// T5.4 the apply form: picks a CV, sends the cover letter, handles refusals.
import '@testing-library/jest-dom/vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import type { PublicJobDetailResponse } from 'contracts';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messages, renderApp } from '@/test/render';
import { CandidateJobApplyForm } from './candidate-job-apply-form';

/** The CV picker has loaded (Radix shows the chosen label twice, so wait on the loader). */
const cvsLoaded = () =>
  waitFor(() =>
    expect(
      screen.queryByText(messages.Candidate.apply.resumeLoading),
    ).not.toBeInTheDocument(),
  );

const { replace, get, post } = vi.hoisted(() => ({
  replace: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/http/web-axios', () => ({
  webHttp: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
  },
}));
vi.mock('@/features/auth', () => ({
  ResendVerificationButton: () => <button type="button">resend</button>,
}));

const t = messages.Candidate.apply;
const JOB = {
  id: '30ff897a-bd6e-4e98-871a-69baf000ee37',
  slug: 'pekar-nis-x7k2',
  title: 'Pekar',
  company: { name: 'Pekara Niš' },
} as unknown as PublicJobDetailResponse;

beforeEach(() => {
  replace.mockReset();
  post.mockReset();
  get.mockReset().mockResolvedValue({
    data: [{ id: 'cv-1', originalFilename: 'Moj CV.pdf' }],
  });
});

describe('applying to a job', () => {
  it('shows the job and, after loading, the primary-CV default', async () => {
    renderApp(<CandidateJobApplyForm job={JOB} />);
    expect(screen.getByRole('heading', { name: 'Pekar' })).toBeInTheDocument();
    expect(screen.getByText('Pekara Niš')).toBeInTheDocument();
    expect(screen.getByText(t.resumeLoading)).toBeInTheDocument();
    await cvsLoaded();
    expect(screen.getAllByText(t.resumeNone).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: t.cancel })).toHaveAttribute(
      'href',
      '/jobs/pekar-nis-x7k2',
    );
  });

  it('sends the trimmed cover letter with the primary CV and goes to my applications', async () => {
    post.mockResolvedValue({ data: { id: 'app-1' } });
    renderApp(<CandidateJobApplyForm job={JOB} />);
    await cvsLoaded();
    await userEvent.type(
      screen.getByLabelText(t.coverLabel),
      '  Imam iskustva.  ',
    );
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/candidate/applications'),
    );
    expect(post).toHaveBeenCalledWith('/api/candidate/applications', {
      jobId: JOB.id,
      coverLetterText: 'Imam iskustva.',
      resumeAssetId: undefined,
    });
  });

  it('an empty cover letter is not sent at all', async () => {
    post.mockResolvedValue({ data: { id: 'app-1' } });
    renderApp(<CandidateJobApplyForm job={JOB} />);
    await cvsLoaded();
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      coverLetterText: undefined,
    });
  });

  it('a refusal shows the translated error and keeps the user on the form', async () => {
    post.mockRejectedValue(
      new AxiosError('conflict', '409', undefined, undefined, {
        status: 409,
        data: {
          error: {
            code: 'APPLICATION_ALREADY_EXISTS',
            message: 'You have already applied',
            requestId: 'r',
          },
        },
      } as AxiosResponse),
    );
    renderApp(<CandidateJobApplyForm job={JOB} />);
    await cvsLoaded();
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.Errors.APPLICATION_ALREADY_EXISTS,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('without a verified email the form explains why and cannot be sent', async () => {
    renderApp(<CandidateJobApplyForm job={JOB} emailVerified={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      t.emailNotVerifiedTitle,
    );
    expect(screen.getByRole('button', { name: t.submit })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    expect(post).not.toHaveBeenCalled();
  });

  it('when the CV list cannot load, the default still works', async () => {
    get.mockRejectedValue(new Error('down'));
    renderApp(<CandidateJobApplyForm job={JOB} />);
    await cvsLoaded();
    expect(screen.getAllByText(t.resumeNone).length).toBeGreaterThan(0);
  });
});
