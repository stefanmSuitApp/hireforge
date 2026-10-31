# Legal texts

The privacy policy, terms of use and refund policy, in Serbian and English.
Written 2026-10-29 by Claude from templates and from what the code actually
does (plan: `docs/plans/LEGAL_AND_INVOICES.md`, C1). **Published 2026-10-29
on Stefan's approval, version `2026-10-29`; not yet reviewed by a lawyer.**

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

- Filled by Stefan (2026-10-29): contact `maticstefan1996@gmail.com` (the
  domain has no mailbox yet), refunds paid within 15 days.
- For the lawyer (the published text states these without caveats):
  - the legal basis for sending email through Resend (USA);
  - the retention periods for applications and CVs;
  - the minimum age for a candidate account (15);
  - "not an employment agency" against the Law on Employment;
  - the liability cap and the court in Niš.
  - Microsoft Clarity (added 2026-10-31, consent only): whether Microsoft
    acts as our processor or as an independent controller under the
    Clarity terms, and the basis for the transfer to the USA;
  - the Clarity retention periods stated (recordings 30 days, aggregates
    13 months) against the current Clarity settings;
  - Google Analytics (added 2026-10-31, consent only): Google LLC as the
    contracting processor for a Serbian customer (outside the EEA) and the
    transfer basis; GA data retention must stay at 14 months to match the
    text.
- Account deletion is by email request until C2 ships; then the privacy
  policy and terms should mention the settings page (a Sanity edit with a
  new "Effective from").
- Anonymising applications after 24 months is stated but built in C5.

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
  1 hour. No access logs, no advertising.
- **Analytics (from 2026-10-31):** Google Analytics 4 and Microsoft Clarity,
  loaded only after the visitor accepts the cookie bar, and only on public pages and the two
  sign-up pages (`apps/web/src/lib/analytics-consent.ts`). Inputs are masked
  by Clarity; other pages are masked and never load it. The choice is kept
  in `hf_analytics_consent` for 180 days.
- **Processors:**
  - Hetzner Online GmbH: server and backups, Nuremberg, Germany;
  - Resend, Inc. (USA): transactional email;
  - Microsoft Corporation (USA): Clarity analytics, consent only;
  - Google LLC (USA): Google Analytics 4, consent only (no Google signals,
    no ads features, no data sharing with Google products);
  - Sanity: CMS content only, no user data.
- **Cookies:** sign-in cookies (14 min / 14 days), `NEXT_LOCALE`,
  `hf_analytics_consent`, and with consent `_ga` / `_ga_<id>` and
  Clarity's `_clck` / `_clsk`;
  localStorage holds the theme, recently viewed jobs, sign-up bar state and
  an unfinished employer sign-up.
- **Backups:** database dumps are kept 14 days on the server and 30 days in
  Hetzner Object Storage.
