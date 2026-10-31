import { z } from 'zod';

// --- Apply by phone, Viber or e-mail (go-to-market WP-A5) -------------------

/**
 * A Serbian number in E.164 (`+381…`), or null. Takes the usual ways it is
 * written: `064 123 4567`, `064/123-4567`, `+381 64…`, `00381…`, and the
 * common `+381 064…`. National numbers are 8–9 digits starting 1–3
 * (landlines) or 6 (mobiles); service numbers (7, 8, 9) are refused.
 */
export function normalizeSerbianPhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-/().]/g, '');
  let national: string;
  if (compact.startsWith('+381')) national = compact.slice(4);
  else if (compact.startsWith('00381')) national = compact.slice(5);
  else if (compact.startsWith('0')) national = compact.slice(1);
  else return null;
  if (national.startsWith('0')) national = national.slice(1);
  return /^[1-36]\d{7,8}$/.test(national) ? `+381${national}` : null;
}

/** `+381641234567` → `064 123 4567` (trunk 0, then groups of 3). */
export function formatSerbianPhone(e164: string): string {
  const national = `0${e164.replace(/^\+381/, '')}`;
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/** Viber runs on mobiles: Serbian mobile numbers start 06x. */
export function isSerbianMobile(e164: string): boolean {
  return /^\+3816\d{7,8}$/.test(e164);
}

export const contactChannels = ['call', 'viber', 'email'] as const;
export type ContactChannel = (typeof contactChannels)[number];

/** Which contact buttons a job shows; none for internal or external apply. */
export function contactChannelsFor(job: {
  applyMode: string;
  applyPhone: string | null;
}): ContactChannel[] {
  if (job.applyMode === 'email') return ['email'];
  if (job.applyMode === 'phone' && job.applyPhone) {
    return isSerbianMobile(job.applyPhone) ? ['call', 'viber'] : ['call'];
  }
  return [];
}

export const serbianPhoneSchema = z
  .string()
  .max(40)
  .transform((v, ctx) => {
    const e164 = normalizeSerbianPhone(v);
    if (!e164) {
      ctx.addIssue({
        code: 'custom',
        message: 'A Serbian phone number, e.g. 064 123 4567',
      });
      return z.NEVER;
    }
    return e164;
  });

export const applyEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(320));

/** `POST /api/public/jobs/:id/contact`: a visitor taps a contact button. */
export const publicJobContactBodySchema = z.object({
  channel: z.enum(contactChannels),
  /** Per page view; a repeat tap in the same view is not counted again. */
  sessionKey: z.string().trim().min(8).max(128),
});

export type PublicJobContactBody = z.infer<typeof publicJobContactBodySchema>;

/** The link the button opens; not in the page HTML, so bots don't harvest it. */
export type PublicJobContactResponse = { href: string; display: string };
