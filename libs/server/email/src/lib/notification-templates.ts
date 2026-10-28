import {
  type EmailLocale,
  type RenderedEmail,
  renderActionEmail,
} from './templates';

/** Transactional notifications driven by outbox events (worker). */
export type NotificationEmail =
  | {
      kind: 'employer_new_application';
      jobTitle: string;
      applicationsUrl: string;
    }
  | { kind: 'employer_job_published'; jobTitle: string; jobUrl: string }
  | {
      kind: 'employer_job_rejected';
      jobTitle: string;
      reason: string | null;
      editUrl: string;
    }
  | {
      kind: 'employer_job_expiring_soon';
      jobTitle: string;
      expiresOn: string;
      jobsUrl: string;
    }
  | { kind: 'employer_job_expired'; jobTitle: string; packagesUrl: string }
  | {
      kind: 'company_join_request_decided';
      companyName: string;
      approved: boolean;
      url: string;
    };

export function notificationMessage(
  locale: EmailLocale,
  n: NotificationEmail,
): RenderedEmail {
  const en = locale === 'en';
  switch (n.kind) {
    case 'employer_new_application':
      return renderActionEmail({
        subject: en
          ? `Šljakam — new application: ${n.jobTitle}`
          : `Šljakam — nova prijava: ${n.jobTitle}`,
        paragraphs: en
          ? ['Hello,', `A candidate applied to your listing "${n.jobTitle}".`]
          : ['Zdravo,', `Kandidat se prijavio na vaš oglas „${n.jobTitle}”.`],
        actionLabel: en ? 'View applications' : 'Pogledaj prijave',
        actionUrl: n.applicationsUrl,
      });
    case 'employer_job_published':
      return renderActionEmail({
        subject: en
          ? `Šljakam — your listing is live: ${n.jobTitle}`
          : `Šljakam — oglas je objavljen: ${n.jobTitle}`,
        paragraphs: en
          ? [
              'Hello,',
              `Your listing "${n.jobTitle}" was approved and is now live.`,
            ]
          : [
              'Zdravo,',
              `Vaš oglas „${n.jobTitle}” je odobren i sada je objavljen.`,
            ],
        actionLabel: en ? 'View listing' : 'Pogledaj oglas',
        actionUrl: n.jobUrl,
      });
    case 'employer_job_rejected':
      return renderActionEmail({
        subject: en
          ? `Šljakam — listing needs changes: ${n.jobTitle}`
          : `Šljakam — oglas zahteva izmene: ${n.jobTitle}`,
        paragraphs: [
          en ? 'Hello,' : 'Zdravo,',
          en
            ? `Your listing "${n.jobTitle}" was not approved.`
            : `Vaš oglas „${n.jobTitle}” nije odobren.`,
          ...(n.reason
            ? [en ? `Reason: ${n.reason}` : `Razlog: ${n.reason}`]
            : []),
        ],
        actionLabel: en ? 'Edit listing' : 'Izmeni oglas',
        actionUrl: n.editUrl,
      });
    case 'employer_job_expiring_soon':
      return renderActionEmail({
        subject: en
          ? `Šljakam — listing expires soon: ${n.jobTitle}`
          : `Šljakam — oglas uskoro ističe: ${n.jobTitle}`,
        paragraphs: en
          ? [
              'Hello,',
              `Your listing "${n.jobTitle}" expires on ${n.expiresOn}.`,
            ]
          : ['Zdravo,', `Vaš oglas „${n.jobTitle}” ističe ${n.expiresOn}.`],
        actionLabel: en ? 'My listings' : 'Moji oglasi',
        actionUrl: n.jobsUrl,
      });
    case 'employer_job_expired':
      return renderActionEmail({
        subject: en
          ? `Šljakam — listing expired: ${n.jobTitle}`
          : `Šljakam — oglas je istekao: ${n.jobTitle}`,
        paragraphs: en
          ? [
              'Hello,',
              `Your listing "${n.jobTitle}" has expired and is no longer public.`,
            ]
          : [
              'Zdravo,',
              `Vaš oglas „${n.jobTitle}” je istekao i više nije javan.`,
            ],
        actionLabel: en ? 'Packages' : 'Paketi',
        actionUrl: n.packagesUrl,
      });
    case 'company_join_request_decided':
      return renderActionEmail({
        subject: n.approved
          ? en
            ? `Šljakam — access to ${n.companyName} approved`
            : `Šljakam — pristup kompaniji ${n.companyName} je odobren`
          : en
            ? `Šljakam — access to ${n.companyName} declined`
            : `Šljakam — pristup kompaniji ${n.companyName} nije odobren`,
        paragraphs: n.approved
          ? en
            ? ['Hello,', `You now have access to ${n.companyName} on Šljakam.`]
            : [
                'Zdravo,',
                `Sada imate pristup kompaniji ${n.companyName} na Šljakam.`,
              ]
          : en
            ? [
                'Hello,',
                `We could not confirm that you belong to ${n.companyName}. Contact support if you think this is a mistake.`,
              ]
            : [
                'Zdravo,',
                `Nismo mogli da potvrdimo da pripadate kompaniji ${n.companyName}. Javite se podršci ako mislite da je ovo greška.`,
              ],
        actionLabel: n.approved
          ? en
            ? 'Open workspace'
            : 'Otvori nalog'
          : en
            ? 'Sign in'
            : 'Prijava',
        actionUrl: n.url,
      });
  }
}
