export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Resend dedupes sends with the same key for 24h (use for retried jobs). */
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: 'not_configured' };

type Env = Record<string, string | undefined>;

export function emailFromHeader(env: Env = process.env): string {
  const address = env['EMAIL_FROM_ADDRESS']?.trim() || 'noreply@sljakam.com';
  const name = env['EMAIL_FROM_NAME']?.trim() || 'Šljakam';
  return `${name} <${address}>`;
}

/**
 * Sends through Resend. Returns `skipped` when `RESEND_API_KEY` is unset (dev,
 * e2e); throws on any non-2xx so callers decide whether to retry or surface it.
 */
export async function sendEmail(
  message: EmailMessage,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<SendEmailResult> {
  const apiKey = env['RESEND_API_KEY']?.trim();
  if (!apiKey) {
    return { status: 'skipped', reason: 'not_configured' };
  }
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(message.idempotencyKey
        ? { 'Idempotency-Key': message.idempotencyKey }
        : {}),
    },
    body: JSON.stringify({
      from: emailFromHeader(env),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend responded ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json().catch(() => null)) as { id?: string } | null;
  return { status: 'sent', id: json?.id ?? null };
}

/** Public web origin for links in emails (no trailing slash). */
export function appPublicOrigin(env: Env = process.env): string {
  const raw =
    env['APP_PUBLIC_ORIGIN']?.trim() ||
    env['NEXT_PUBLIC_APP_URL']?.trim() ||
    '';
  return raw.replace(/\/+$/, '');
}
