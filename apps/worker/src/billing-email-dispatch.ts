import { eq } from 'drizzle-orm';

import type { DrizzleDb } from 'database';
import { employers, users } from 'database';
import type { OutboxEventType } from 'shared';

import { workerLog } from './worker-log';

function billingTestMode(): boolean {
  return process.env.BILLING_TEST_MODE?.trim() === '1';
}

async function employerContactEmail(
  db: DrizzleDb,
  companyId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ email: users.email })
    .from(employers)
    .innerJoin(users, eq(employers.userId, users.id))
    .where(eq(employers.companyId, companyId))
    .limit(1);
  const email = row?.email?.trim();
  return email && email.length > 0 ? email : null;
}

function dashOrigin(): string {
  const raw =
    process.env.BILLING_EMAIL_DASHBOARD_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    '';
  return raw.replace(/\/$/, '');
}

function billingEmailLocale(payload: Record<string, unknown>): 'sr' | 'en' {
  return payload['invoiceLanguage'] === 'en' ? 'en' : 'sr';
}

/**
 * Optional Resend send after billing outbox events (outside the claim transaction).
 * No-op when `RESEND_API_KEY` is unset — `email_intent` logs still come from hooks.
 */
export async function sendBillingTransactionalEmail(opts: {
  db: DrizzleDb;
  eventType: OutboxEventType;
  payload: unknown;
}): Promise<void> {
  if (
    opts.eventType !== 'proforma_issued' &&
    opts.eventType !== 'invoice_issued'
  ) {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return;
  }

  const pl = opts.payload as Record<string, unknown>;
  const companyId = typeof pl['companyId'] === 'string' ? pl['companyId'] : '';
  if (!companyId) {
    return;
  }

  let to = await employerContactEmail(opts.db, companyId);
  if (!to) {
    workerLog('warn', 'billing_email_no_recipient', {
      service: 'worker',
      eventType: opts.eventType,
      companyId,
    });
    return;
  }

  if (billingTestMode()) {
    const redirect = process.env.BILLING_EMAIL_TEST_TO?.trim();
    if (redirect) {
      to = redirect;
    }
  }

  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS?.trim() || 'noreply@sljakam.com';
  const fromDisplay = process.env.EMAIL_FROM_NAME?.trim() || 'Šljakam';
  const from = `${fromDisplay} <${fromEmail}>`;

  const origin = dashOrigin();
  const loc = billingEmailLocale(pl);
  const dashSeg = loc === 'en' ? 'en' : 'sr';

  let subject = '';
  let text = '';
  let html = '';

  if (opts.eventType === 'proforma_issued') {
    const proformaId =
      typeof pl['proformaId'] === 'string' ? pl['proformaId'] : '';
    const path = `/${dashSeg}/employer/billing/proforma/${proformaId}`;
    const url = origin ? `${origin}${path}` : path;
    const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    if (loc === 'en') {
      subject = 'Šljakam — your pro forma is ready';
      text = ['Your pro forma invoice is ready.', '', `Open: ${url}`].join(
        '\n',
      );
      html = `<p>Hello,</p><p>Your pro forma invoice is ready on Šljakam.</p><p><a href="${safeUrl}">View pro forma</a></p>`;
    } else {
      subject = 'Šljakam — profaktura je spremna';
      text = [`Profaktura je izadata.`, '', `Otvorite: ${url}`].join('\n');
      html = `<p>Zdravo,</p><p>Profaktura je izadata na Šljakam.</p><p><a href="${safeUrl}">Otvori profakturu</a></p>`;
    }
  } else {
    const path = `/${dashSeg}/employer/packages`;
    const url = origin ? `${origin}${path}` : path;
    const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    if (loc === 'en') {
      subject = 'Šljakam — invoice issued';
      text = [
        `Your subscription invoice has been issued.`,
        '',
        `Dashboard: ${url}`,
      ].join('\n');
      html = `<p>Hello,</p><p>Your subscription invoice has been issued. Manage packages from your dashboard.</p><p><a href="${safeUrl}">Packages</a></p>`;
    } else {
      subject = 'Šljakam — račun je izdat';
      text = [
        `Račun za pretplatu je izdat.`,
        '',
        `Kontrolna tabla: ${url}`,
      ].join('\n');
      html = `<p>Zdravo,</p><p>Račun je izdat. Možete pratiti pretplatu među paketima.</p><p><a href="${safeUrl}">Paketi</a></p>`;
    }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    workerLog('error', 'billing_email_resend_failed', {
      service: 'worker',
      eventType: opts.eventType,
      status: String(res.status),
      bodySnippet: errBody.slice(0, 500),
    });
    return;
  }

  workerLog('info', 'billing_email_sent', {
    service: 'worker',
    eventType: opts.eventType,
    companyId,
  });
}
