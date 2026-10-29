import { describe, expect, it, vi } from 'vitest';

import { appPublicOrigin, sendEmail } from './send-email';
import { notificationMessage } from './notification-templates';
import { passwordResetMessage, verifyEmailMessage } from './templates';

describe('templates', () => {
  it('escapes the link in HTML and keeps it raw in text', () => {
    const url = 'https://sljakam.com/sr/verify-email?token=a"b<c>&d';
    const msg = verifyEmailMessage('sr', url);
    expect(msg.subject).toBe('Šljakam — potvrdite e-poštu');
    expect(msg.html).toContain(
      'href="https://sljakam.com/sr/verify-email?token=a&quot;b&lt;c&gt;&amp;d"',
    );
    expect(msg.html).not.toContain('<c>');
    expect(msg.text).toContain(url);
  });

  it('renders English reset copy', () => {
    const msg = passwordResetMessage('en', 'https://x.test/r');
    expect(msg.subject).toBe('Šljakam — reset your password');
    expect(msg.text).toContain('Set a new password: https://x.test/r');
  });
});

describe('sendEmail', () => {
  it('skips without RESEND_API_KEY and never calls fetch', async () => {
    const fetchImpl = vi.fn();
    const result = await sendEmail(
      { to: 'a@b.test', subject: 's', text: 't', html: 'h' },
      {},
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toEqual({ status: 'skipped', reason: 'not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts to Resend with idempotency key and from header', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }),
    );
    const result = await sendEmail(
      {
        to: 'a@b.test',
        subject: 's',
        text: 't',
        html: 'h',
        idempotencyKey: 'outbox-7',
      },
      {
        RESEND_API_KEY: 're_x',
        EMAIL_FROM_ADDRESS: 'noreply@sljakam.com',
        EMAIL_FROM_NAME: 'Šljakam',
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toEqual({ status: 'sent', id: 'em_1' });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('outbox-7');
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'Šljakam <noreply@sljakam.com>',
      to: ['a@b.test'],
    });
  });

  it('sends every message to EMAIL_REDIRECT_TO and names the real recipient', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ id: 'em_2' }), { status: 200 }),
    );
    await sendEmail(
      { to: 'employer@firma.rs', subject: 'Profaktura', text: 't', html: 'h' },
      { RESEND_API_KEY: 're_x', EMAIL_REDIRECT_TO: ' stefan@inbox.test ' },
      fetchImpl as unknown as typeof fetch,
    );
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(['stefan@inbox.test']);
    expect(body.subject).toBe('[→ employer@firma.rs] Profaktura');
  });

  it('throws on a Resend error so callers can retry', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad', { status: 422 }));
    await expect(
      sendEmail(
        { to: 'a@b.test', subject: 's', text: 't', html: 'h' },
        { RESEND_API_KEY: 're_x' },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow('Resend responded 422');
  });
});

describe('appPublicOrigin', () => {
  it('prefers APP_PUBLIC_ORIGIN and trims trailing slashes', () => {
    expect(
      appPublicOrigin({
        APP_PUBLIC_ORIGIN: 'https://a.test/',
        NEXT_PUBLIC_APP_URL: 'https://b.test',
      }),
    ).toBe('https://a.test');
    expect(appPublicOrigin({ NEXT_PUBLIC_APP_URL: 'https://b.test' })).toBe(
      'https://b.test',
    );
  });
});

describe('notificationMessage', () => {
  it('renders the Serbian new-application email with an escaped link', () => {
    const msg = notificationMessage('sr', {
      kind: 'employer_new_application',
      jobTitle: 'Programer <C#>',
      applicationsUrl: 'https://sljakam.com/sr/employer/jobs/1/applications',
    });
    expect(msg.subject).toBe('Šljakam — nova prijava: Programer <C#>');
    expect(msg.html).toContain('Programer &lt;C#&gt;');
    expect(msg.text).toContain(
      'Pogledaj prijave: https://sljakam.com/sr/employer/jobs/1/applications',
    );
  });

  it('includes the rejection reason only when present', () => {
    const withReason = notificationMessage('en', {
      kind: 'employer_job_rejected',
      jobTitle: 'Driver',
      reason: 'Salary missing',
      editUrl: 'https://x.test/e',
    });
    expect(withReason.text).toContain('Reason: Salary missing');
    const without = notificationMessage('en', {
      kind: 'employer_job_rejected',
      jobTitle: 'Driver',
      reason: null,
      editUrl: 'https://x.test/e',
    });
    expect(without.text).not.toContain('Reason:');
  });
});
