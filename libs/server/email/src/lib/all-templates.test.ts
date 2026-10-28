// T5.2 every email renders in Serbian and English: subject, text and HTML
// carry the variables (no "undefined", no empty slots, no raw "${"), the link
// is in both bodies, and user-supplied values are HTML-escaped.
import { describe, expect, it } from 'vitest';
import {
  notificationMessage,
  type NotificationEmail,
} from './notification-templates';
import {
  emailLocale,
  escapeHtml,
  passwordResetMessage,
  renderActionEmail,
  verifyEmailMessage,
} from './templates';

const TITLE = 'Vozač <C> & "E"';
const URL = 'https://sljakam.test/sr/x?a=1&b=2';
const NOTIFICATIONS: NotificationEmail[] = [
  { kind: 'employer_new_application', jobTitle: TITLE, applicationsUrl: URL },
  { kind: 'employer_job_published', jobTitle: TITLE, jobUrl: URL },
  {
    kind: 'employer_job_rejected',
    jobTitle: TITLE,
    reason: 'Nedostaje plata',
    editUrl: URL,
  },
  {
    kind: 'employer_job_rejected',
    jobTitle: TITLE,
    reason: null,
    editUrl: URL,
  },
  {
    kind: 'employer_job_expiring_soon',
    jobTitle: TITLE,
    expiresOn: '2. 2. 2026.',
    jobsUrl: URL,
  },
  { kind: 'employer_job_expired', jobTitle: TITLE, packagesUrl: URL },
  {
    kind: 'company_join_request_decided',
    companyName: 'Firma <d.o.o.>',
    approved: true,
    url: URL,
  },
  {
    kind: 'company_join_request_decided',
    companyName: 'Firma <d.o.o.>',
    approved: false,
    url: URL,
  },
];

function expectComplete(m: { subject: string; text: string; html: string }) {
  for (const part of [m.subject, m.text, m.html]) {
    expect(part).not.toMatch(/undefined|null|\$\{|NaN|\[object/);
    expect(part.trim().length).toBeGreaterThan(0);
  }
  expect(m.text).toContain(URL);
  expect(m.html).toContain(escapeHtml(URL));
  expect(m.html).not.toMatch(/<C>|<d\.o\.o\.>/);
}

describe.each(['sr', 'en'] as const)('notifications in %s', (locale) => {
  for (const n of NOTIFICATIONS) {
    it(`${n.kind}${'approved' in n ? (n.approved ? ' (approved)' : ' (declined)') : ''}${'reason' in n && n.reason === null ? ' (no reason)' : ''} renders completely`, () => {
      const m = notificationMessage(locale, n);
      expectComplete(m);
      expect(m.subject.startsWith('Šljakam — ')).toBe(true);
      const name = 'jobTitle' in n ? n.jobTitle : n.companyName;
      expect(m.subject).toContain(name);
      expect(m.html).toContain(escapeHtml(name));
    });
  }

  it('the rejection reason is shown only when there is one', () => {
    const withReason = notificationMessage(
      locale,
      NOTIFICATIONS[2] as NotificationEmail,
    );
    const without = notificationMessage(
      locale,
      NOTIFICATIONS[3] as NotificationEmail,
    );
    expect(withReason.text).toContain('Nedostaje plata');
    expect(without.text).not.toMatch(/Reason|Razlog/);
  });

  it.each([
    ['verification', verifyEmailMessage],
    ['password reset', passwordResetMessage],
  ] as const)(
    '%s email renders completely with its validity footnote',
    (_, render) => {
      const m = render(locale, URL);
      expectComplete(m);
      expect(m.text).toMatch(
        locale === 'en' ? /valid|expires/i : /važi|ističe/i,
      );
    },
  );
});

describe('languages differ', () => {
  it('every notification has different Serbian and English subjects', () => {
    for (const n of NOTIFICATIONS) {
      expect(notificationMessage('sr', n).subject).not.toBe(
        notificationMessage('en', n).subject,
      );
    }
  });

  it('any unknown locale falls back to Serbian', () => {
    expect(emailLocale('en')).toBe('en');
    expect(emailLocale('de')).toBe('sr');
    expect(emailLocale(undefined)).toBe('sr');
  });
});

describe('the action email layout', () => {
  it('escapes every user value and keeps the text version raw', () => {
    const m = renderActionEmail({
      subject: 's',
      paragraphs: [`<img src=x onerror=alert(1)>`],
      actionLabel: `"><script>`,
      actionUrl: `javascript:"><b>`,
      footnote: `'single'`,
    });
    expect(m.html).not.toMatch(/<img|<script|<b>/);
    expect(m.html).toContain('&#39;single&#39;');
    expect(m.text).toContain(`<img src=x onerror=alert(1)>`);
  });
});
