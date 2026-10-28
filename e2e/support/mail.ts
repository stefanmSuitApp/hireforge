import { expect } from '@playwright/test';

import { MAIL_ORIGIN } from './ports';

type FakeEmail = { to: string[]; subject: string; text: string };

/** e2e/support/fake-resend.mjs */
const FAKE_RESEND = MAIL_ORIGIN;

/** Waits until the fake Resend received a mail for `to` whose subject matches. */
export async function expectEmail(
  to: string,
  subject: RegExp,
): Promise<FakeEmail> {
  let found: FakeEmail | undefined;
  await expect
    .poll(
      async () => {
        const res = await fetch(
          `${FAKE_RESEND}/emails?to=${encodeURIComponent(to)}`,
        );
        const list = (await res.json()) as FakeEmail[];
        found = list.find((e) => subject.test(e.subject));
        return Boolean(found);
      },
      { timeout: 20_000, message: `email to ${to} matching ${subject}` },
    )
    .toBe(true);
  return found as FakeEmail;
}

/** Waits until `count` mails matching `subject` reached `to`; returns them oldest first. */
export async function expectEmails(
  to: string,
  subject: RegExp,
  count: number,
): Promise<FakeEmail[]> {
  let found: FakeEmail[] = [];
  await expect
    .poll(
      async () => {
        const res = await fetch(
          `${FAKE_RESEND}/emails?to=${encodeURIComponent(to)}`,
        );
        found = ((await res.json()) as FakeEmail[]).filter((e) =>
          subject.test(e.subject),
        );
        return found.length;
      },
      {
        timeout: 20_000,
        message: `${count} emails to ${to} matching ${subject}`,
      },
    )
    .toBeGreaterThanOrEqual(count);
  return found;
}

/** First http(s) link in the plain-text body that contains `pathPart`. */
export function linkFrom(email: FakeEmail, pathPart: string): string {
  const link = email.text
    .split(/\s+/)
    .find((w) => /^https?:\/\//.test(w) && w.includes(pathPart));
  if (!link) {
    throw new Error(`no ${pathPart} link in email "${email.subject}"`);
  }
  return link;
}
