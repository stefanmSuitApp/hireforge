export type EmailLocale = 'sr' | 'en';

export type RenderedEmail = { subject: string; text: string; html: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emailLocale(value: unknown): EmailLocale {
  return value === 'en' ? 'en' : 'sr';
}

/** One call-to-action email: greeting, paragraphs, a button-link, footer note. */
export function renderActionEmail(input: {
  subject: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  footnote?: string;
}): RenderedEmail {
  const url = escapeHtml(input.actionUrl);
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111">',
    ...input.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    `<p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:999px;text-decoration:none">${escapeHtml(input.actionLabel)}</a></p>`,
    `<p style="font-size:13px;color:#555">${escapeHtml(input.actionUrl)}</p>`,
    input.footnote
      ? `<p style="font-size:13px;color:#555">${escapeHtml(input.footnote)}</p>`
      : '',
    '</div>',
  ].join('');
  const text = [
    ...input.paragraphs,
    '',
    `${input.actionLabel}: ${input.actionUrl}`,
    ...(input.footnote ? ['', input.footnote] : []),
  ].join('\n');
  return { subject: input.subject, text, html };
}

export function verifyEmailMessage(
  locale: EmailLocale,
  url: string,
): RenderedEmail {
  return locale === 'en'
    ? renderActionEmail({
        subject: 'Šljakam — confirm your email',
        paragraphs: [
          'Hello,',
          'Confirm your email address to finish setting up your Šljakam account.',
        ],
        actionLabel: 'Confirm email',
        actionUrl: url,
        footnote:
          'The link is valid for 48 hours. If you did not create an account, ignore this email.',
      })
    : renderActionEmail({
        subject: 'Šljakam — potvrdite e-poštu',
        paragraphs: [
          'Zdravo,',
          'Potvrdite adresu e-pošte da biste završili podešavanje Šljakam naloga.',
        ],
        actionLabel: 'Potvrdi e-poštu',
        actionUrl: url,
        footnote:
          'Link važi 48 sati. Ako niste napravili nalog, zanemarite ovu poruku.',
      });
}

/** Staff created the account; the person sets their first password. */
export function accountInviteMessage(
  locale: EmailLocale,
  url: string,
  companyName: string,
): RenderedEmail {
  return locale === 'en'
    ? renderActionEmail({
        subject: 'Šljakam — you are invited to your company account',
        paragraphs: [
          'Hello,',
          `The Šljakam team has opened an account for ${companyName}. Set a password to activate it, then post jobs and follow applications.`,
        ],
        actionLabel: 'Activate account',
        actionUrl: url,
        footnote:
          'The link is valid for 7 days and works once. If you did not expect this email, ignore it.',
      })
    : renderActionEmail({
        subject: 'Šljakam — pozvani ste na nalog kompanije',
        paragraphs: [
          'Zdravo,',
          `Tim Šljakam je otvorio nalog za kompaniju ${companyName}. Postavite lozinku da biste ga aktivirali, a zatim objavljujte oglase i pratite prijave.`,
        ],
        actionLabel: 'Aktiviraj nalog',
        actionUrl: url,
        footnote:
          'Link važi 7 dana i može se iskoristiti jednom. Ako niste očekivali ovu poruku, zanemarite je.',
      });
}

export function passwordResetMessage(
  locale: EmailLocale,
  url: string,
): RenderedEmail {
  return locale === 'en'
    ? renderActionEmail({
        subject: 'Šljakam — reset your password',
        paragraphs: [
          'Hello,',
          'We received a request to reset the password for your Šljakam account.',
        ],
        actionLabel: 'Set a new password',
        actionUrl: url,
        footnote:
          'The link is valid for 1 hour and works once. If you did not ask for this, ignore this email; your password stays the same.',
      })
    : renderActionEmail({
        subject: 'Šljakam — promena lozinke',
        paragraphs: [
          'Zdravo,',
          'Primili smo zahtev za promenu lozinke za vaš Šljakam nalog.',
        ],
        actionLabel: 'Postavi novu lozinku',
        actionUrl: url,
        footnote:
          'Link važi 1 sat i može se iskoristiti jednom. Ako niste tražili promenu, zanemarite ovu poruku; lozinka ostaje ista.',
      });
}
