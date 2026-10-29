# Legal texts — drafts for review

Drafts of the privacy policy, terms of use and refund policy, in Serbian and
English. Written 2026-10-29 by Claude from templates and from what the code
actually does (plan: `docs/plans/LEGAL_AND_INVOICES.md`, C1). **Not reviewed
by a lawyer.**

| File                 | Page on the site             |
| -------------------- | ---------------------------- |
| `privacy.{sr,en}.md` | `/sr/privacy`, `/en/privacy` |
| `terms.{sr,en}.md`   | `/sr/terms`, `/en/terms`     |
| `refunds.{sr,en}.md` | `/sr/refunds`, `/en/refunds` |

## How they get to the site

1. `pnpm cms:seed:legal` loads them into Sanity as **unpublished drafts**
   (needs a write token in `.env`; skips any page that already exists).
2. Stefan reads them in Studio (Legal pages), fills the `TODO(Stefan)`
   items, removes the `[⚖ …]` notes he has settled, sets "Effective from"
   and presses **Publish**.
3. The page, its footer link and the sign-up / checkout notices appear
   within seconds. The terms' "Effective from" date is recorded as the
   accepted version for every new sign-up.

After publishing, **Sanity is the source of truth**; these files are the
starting draft and the copy for the lawyer.

## Open items

- `TODO(Stefan)`: privacy contact email, support email, refund payout days.
- `[⚖ …]` notes for the lawyer:
  - the legal basis for sending email through Resend (USA);
  - the retention periods for applications and CVs;
  - the minimum age for a candidate account (15);
  - "not an employment agency" against the Law on Employment;
  - the liability cap and the court in Niš.
- The privacy policy promises things built in later phases:
  - self-service account deletion with a 30-day grace (C2);
  - anonymising applications after 24 months (C5).

  Publish it after C2 ships, or soften those lines.

## Facts the texts rely on (for the lawyer)

- **Operator:** Stefan Matić PR veb portali WEBLEGION Niš (Medijana),
  Rentgenova 10/4, 18108 Niš; MB 67907442, PIB 114857284; a flat-rate
  (paušal) sole proprietor, not in the VAT system.
- **Data collected:**
  - account email and password hash;
  - candidate name, phone, headline, city and the CV-builder data
    (experience, education, skills);
  - uploaded CVs (PDF/DOC/DOCX, ≤5 MB, stored on the server's disk);
  - applications with cover letters;
  - employer company, billing and bank details.
- **Shared with employers:** only data from applications to their own jobs.
  There is no searchable candidate database.
- **IP addresses:** only in Redis rate-limit counters, which expire within
  1 hour. No access logs, no analytics, no advertising, no third-party
  scripts.
- **Processors:**
  - Hetzner Online GmbH: server and backups, Nuremberg, Germany;
  - Resend, Inc. (USA): transactional email;
  - Sanity: CMS content only, no user data.
- **Cookies:** sign-in cookies (14 min / 14 days) and `NEXT_LOCALE` only;
  localStorage holds the theme, recently viewed jobs, sign-up bar state and
  an unfinished employer sign-up.
- **Backups:** database dumps are kept 14 days on the server and 30 days in
  Hetzner Object Storage.
