# Plan — Legal pages, account deletion, invoices and credit notes

Written 2026-10-29 from `origin/main` at `cce13c7`. Covers PROGRESS.md
"Phase E" items 1–2 and `docs/refactor/MIGRATION_PLAN.md` Step 16 (minus the
cookie banner, see D6).

Stefan's answers (2026-10-29):

- **Legal texts:** Claude drafts privacy, terms and refund policy from
  templates, matched to what the app really does; marked for legal review.
- **Operator:** Stefan's flat-rate sole proprietorship (paušalac),
  **STEFAN MATIĆ PR WEBLEGION**. Later it moves to **DEVLEGION D.O.O.**, so
  the operator's data must be configurable, never hardcoded.
- **Account deletion:** self-service with a 30-day grace period.
- **Billing:** build what doesn't need the accountant. As a paušalac Stefan
  expects no SEF (e-invoicing) duty; checked in §1.

## 1. SEF and invoice rules for a paušalac (checked 2026-10-29)

Not legal advice; the accountant should confirm the items marked ⚖.

- **SEF is not required for invoices to companies.** Under the Law on
  Electronic Invoicing (consolidated through Sl. glasnik RS 80/2026), the
  B2B duty (Art. 3) applies to "subjekti privatnog sektora", which Art. 2(3)
  defines as **VAT payers**. A paušalac outside the VAT system can issue
  ordinary PDF invoices to Serbian and foreign companies.
- **Exceptions:**
  - Invoices to the **public sector** must go through SEF.
  - **Registering voluntarily** on SEF makes it mandatory for the current
    and the following calendar year (Art. 5(7)–(8)).
  - The 2027 amendments concern VAT payers and change nothing for a
    non-VAT paušalac.
  - Šljakam doesn't sell to the public sector, so **no SEF integration**.
    If a public-sector employer ever buys, that invoice is issued by hand.
- **What the invoice must show** (practitioner guides; ⚖ confirm):
  - **Seller:** full registered name, address, PIB (tax ID), MB
    (registration number) and bank account.
  - **Buyer:** name, address, PIB and MB.
  - **Document:** sequential number, issue date, **date of supply**, a
    description of the service, and the amount.
  - **Non-VAT note:** a note that the seller is not in the VAT system,
    usually "Obveznik nije u sistemu PDV-a (član 33. Zakona o PDV-u)".
  - **Foreign buyers:** the amount in EUR plus the RSD equivalent at the
    NBS middle rate, IBAN and SWIFT, and a place-of-supply note (VAT Law
    Art. 12(4)).
- **Thresholds to watch** (⚖): above the VAT threshold (8 M RSD over 12
  months) the operator must enter the VAT system, and then SEF applies. The
  flat-rate regime has its own yearly limit. Either one is the moment to
  move to DEVLEGION D.O.O.; the design below makes that a data change, not
  a code change.
- **Fiscal cash register:** not needed. Šljakam's sales are B2B, paid by
  bank transfer, not retail (⚖).

Sources: [Zakon o elektronskom fakturisanju (paragraf.rs)](https://www.paragraf.rs/propisi/zakon-o-elektronskom-fakturisanju.html),
[pausalko.rs](https://pausalko.rs/blog/efakture-sef-pausalci/),
[stavka.rs](https://stavka.rs/vodic/e-fakture-sef-pausalci/),
[feruvi.rs](https://feruvi.rs/blog/faktura-kako-se-izdaje),
[fakturko.io](https://fakturko.io/blog/obrazac-fakture-za-pausalce-sablon-i-uputstvo).

**This changes the current design.** `companies.vat_treatment` defaults to
`rs_standard_20`, and SSOT §10.4 talks of a VAT flag flip. For a paušalac,
every document carries the non-VAT note and no VAT line. The default stays
in the schema (it describes the buyer), but the PDF ignores it until the
operator is a VAT payer.

## 2. What exists today

**Legal and consent:**

- No privacy or terms pages, and no footer links to them. Unused message
  keys `Footer.privacy` and `Footer.terms` already exist.
- The CMS `refundPolicy` document has only a title and a one-line summary,
  seeded as a stub. Only the proforma page and PDF show it.
- Nothing is recorded at sign-up. There is no consent column on `users`,
  and `employerSelfSignupBodySchema` is `.strict()`.
- No cookie banner and no analytics.

**Account deletion:** there is no code for it.

- Foreign keys that block or break deletion:
  - `jobs.created_by_user_id` and `job_description_media.created_by_user_id`
    are **restrict**, so an employer who has posted can't be deleted.
  - `staff_audit_log.actor_user_id` is **cascade**, so deleting a user
    deletes their audit rows. SSOT §10.7 says that log is kept forever.
- CV files sit in the `api_var` volume, and database cascades don't remove
  them.

**Billing:**

- **PDF:** proforma and invoice share one template
  (`libs/server/pdf/src/lib/billing-form-document.tsx`). It prints only the
  buyer's legal name. There is no seller block, no buyer PIB, MB or address,
  no line item, no date of supply and no non-VAT note.
- **No invoice access for employers:** no API endpoint, BFF route or page
  for invoices. The invoice email links to `/employer/packages`.
- **Credit notes:** the `credit_notes` table, `CN-YYYY/NNNNNN` numbering and
  a Zod schema exist, but no code uses them.
- **Cancellation:** admin cancel only sets `cancelled`, and a rejected job
  has no billing effect. So SSOT §10.5 (a refund for a rejected or cancelled
  paid plan) isn't implemented.
- **Billing emails** go to the first employer user, not to
  `companies.billing_email`. This is already a Phase T open question.

## 3. Phases

Each phase is its own PR, checked, shipped and verified live, as usual.
**C1 and C2** need no accountant. **C3** ships with the seller data as
`TODO(Stefan)` placeholders until Stefan fills them in Sanity.

### C1 — Legal pages and sign-up acceptance

As built (branch `feat/legal-pages`):

- **Sanity `legalPage` type:**
  - One document per page, with fixed ids `legal-privacy`, `legal-terms`
    and `legal-refunds`, under "Legal pages" in Studio. No create or
    delete.
  - Bilingual title and body, both required before publish (SSOT §13.3).
  - `effectiveFrom` (date): shown as "last updated", and it is the terms
    version recorded at sign-up.
  - `summary` (refunds only) now feeds the proforma excerpt. The old
    `refundPolicy` type is the fallback and is marked "(old)".
- **Drafts stay private:**
  - The web's read token can see drafts, so every query reads the
    published ids only.
  - A draft goes live only when someone presses Publish in Studio. That
    replaces the planned "Nacrt" header line (D2).
- **Routes:**
  - `/{locale}/privacy`, `/{locale}/terms` and `/{locale}/refunds`.
  - They 404 until published; once published they're indexable and in the
    sitemap.
  - The revalidation webhook refreshes all three on any `legalPage`
    change.
- **Links:**
  - The site shell reads which pages are published once and shares it
    through a context.
  - The footer links each published page.
  - The register forms (and so the sign-up sheet on job pages) show the
    acceptance line once terms and privacy are both published.
  - The packages page shows a refunds and terms line.
  - The proforma PDF footer URL and an email footer link are left for C3.
- **Sign-up acceptance:**
  - Migration 0035 adds `users.terms_accepted_at` and
    `users.terms_version`.
  - The register BFF routes set `acceptedTermsVersion` themselves, from the
    published terms and only under the same condition as the notice. A
    value sent by the browser is dropped.
- **Draft texts:**
  - `docs/legal/{privacy,terms,refunds}.{sr,en}.md`, plus a README for the
    lawyer.
  - They're built from a personal-data inventory of the code.
  - `pnpm cms:seed:legal` loads them as unpublished drafts and never
    overwrites an existing page.
- **Tests:**
  - Unit: the notices hide links to unpublished pages; the BFF helper
    ignores a client-sent version; the sitemap lists only published pages.
  - Integration (`auth-flow`): sign-up stores the version, stores nothing
    without one, and rejects a malformed one. It fails without the API
    change.
  - e2e runs without Sanity, so there the pages 404 and the notices are
    hidden.

### C2 — Account deletion (self-service, 30-day grace)

- **Settings page:** `/{locale}/account`, one page for candidate and
  employer, linked from the user menu.
  - Shows email, password change (link to the existing reset flow) and
    "Delete account".
  - Delete needs the password typed again and a confirm dialog that says
    what's erased and what's kept.
- **Request:**
  - Migration: `users.deletion_requested_at` (nullable).
  - `POST /api/account/deletion` (BFF → Nest) sets it, bumps
    `token_version` (signs out every device) and sends a confirmation email
    with the date.
- **Cancel:** signing in during the grace period shows "Your account is
  scheduled for deletion on D. Keep it?". Keeping it clears the column.
  Until then, nothing else in the app works for that user.
- **Erase:** a daily worker job, idempotent, one user per transaction.
  - **Candidate:**
    - Delete stored CV files, then the user row. The cascade removes
      candidate, resumes, applications, saved jobs and searches, and
      tokens.
    - The audit trace is a `staff_audit_log` row with a non-PII trace ID.
  - **Employer:**
    - Delete the person: user, `employers` row, tokens and join requests.
    - Keep the company, its jobs and all billing documents (10-year
      retention).
    - Jobs keep running; their creator becomes null.
  - **Staff:** not self-service (admin-only, out of scope).
- **Migrations** (with rollback headers):
  - `jobs.created_by_user_id` and `job_description_media.created_by_user_id`
    become nullable with `on delete set null`.
  - `staff_audit_log.actor_user_id` becomes `on delete set null`, so the
    log survives.
- **Emails:** "deletion scheduled" (with how to cancel) and "account
  deleted".
- **Tests:**
  - Integration: erase after grace, sign-in cancels, files removed, employer
    erase keeps company, jobs and invoices, idempotent re-run.
  - e2e: a candidate deletes and is signed out; signing in again offers
    "keep account".
- **Not in C2:** the 24-month application retention sweeper (C5).

### C3 — Invoice content and employer access

- **Operator data in Sanity:**
  - New `siteSettings.operator` block: legal name, address, PIB, MB, RSD
    account, foreign-currency IBAN/SWIFT, `vatRegistered` (false),
    `nonVatNote` sr/en.
  - It replaces the separate `wireTransfer` fields: one source for invoices
    and the privacy policy.
  - Editing requires the Sanity admin role (the bank-detail
    payment-redirection risk in PROGRESS.md).
  - `BILLING_*` env vars stay as a fallback.
- **Snapshot per document:** migration adds `seller_snapshot` and
  `buyer_snapshot` jsonb to `proformas`, `invoices` and `credit_notes`,
  filled at issue time. A later switch to D.O.O. never rewrites old
  invoices, and re-rendering a PDF gives the same document.
- **PDF template:**
  - Seller and buyer blocks (name, address, PIB, MB, or VAT ID and country
    for foreign buyers).
  - A line item: package name, period from–to, quantity 1, amount.
  - Date of supply (the subscription's `starts_at`), the non-VAT note, and a
    place-of-supply note for foreign buyers.
  - The RSD equivalent stays as today.
  - With the seller fields empty, the PDF shows `TODO(Stefan): podaci
izdavaoca` in **test mode only**. Production refuses to issue
    (`BILLING_SELLER_INCOMPLETE`), so an invalid invoice never goes out.
- **Employer access:**
  - "Računi" list on `/employer/packages`: proformas, invoices and credit
    notes, with number, date, amount, status and a PDF download.
  - New endpoints `GET employer/billing/invoices[/:id/pdf]` (company-scoped)
    and BFF routes.
  - The invoice email links to the document.
- **Tests:**
  - Unit (template snapshot with all blocks; foreign vs domestic; non-VAT
    note).
  - Integration: snapshot frozen after operator edits; production refusal
    when seller incomplete.
  - e2e: employer downloads their invoice; another company can't.

### C4 — Credit notes (refunds)

- **Admin action "Cancel and refund"** on a paid subscription:
  - Locks the row.
  - Issues a `CN-YYYY/NNNNNN` credit note for the full invoice amount
    (partial amounts later, D5).
  - Sets `invoices.voided_at`, cancels the subscription, and archives its
    live jobs.
  - Writes the audit row and an outbox event `credit_note_issued`
    (PDF + email).
  - Records "refund to be paid manually" with reference fields (date paid,
    bank reference) that admin fills after paying back.
- **Rejected job:** when a moderator rejects the only job of a paid,
  never-published subscription, the rejection screen offers "Cancel and
  refund". It is not automatic: money is involved, and a fixed and
  resubmitted job is the common case.
- **Unpaid proformas:** unchanged (voided after 14 days). Admin cancel of
  an unpaid plan also voids its proforma (today it doesn't).
- **Credit note PDF:** the same template, titled "Knjižno odobrenje" /
  "Credit note", referencing the invoice number and date, with a reason.
- **Tests:**
  - Integration: double refund blocked under a race; numbers are
    sequential; invoice voided.
  - e2e: admin refunds, then the employer sees the credit note.

### C5 — Retention sweeper (after C1–C4)

- **Daily job:** anonymise applications older than 24 months. Clear cover
  letter and contact snapshot, delete the CV file when no live application
  uses it, and keep counts.
- **Idempotent**, with an integration test using a moved clock.

## 4. Decisions (Claude's defaults; Stefan may override)

- **D1 — Legal URLs:** `/privacy`, `/terms`, `/refunds`, in English like
  the other routes (`/jobs`, `/employers`, `/about`).
- **D2 — Draft legal texts go live** once Stefan has read them, with the
  "Nacrt" header removed. Lawyer review follows. A reviewed text later is a
  Sanity edit with a new `version`. (Stefan, 2026-10-29.)
- **D3 — Acceptance:** a notice line plus recorded version. No checkbox:
  the legal basis for an account is the contract, not consent, and the
  recorded version proves which terms applied. (Stefan, 2026-10-29.)
- **Order:** C1 → C2 → C3 → C4, then C5. (Stefan, 2026-10-29.)
- **D4 — No re-acceptance prompt** for existing users when terms change.
  The update is announced by email when it matters. Revisit with the
  lawyer.
- **D5 — Credit notes:** full amount only. Partial ones only if a real
  case needs them.
- **D6 — Cookie banner only with analytics:**
  - Without analytics the site only sets strictly necessary cookies
    (session, locale, guest sign-up bar in localStorage), which need no
    consent.
  - 2026-10-31, Stefan: Microsoft Clarity, loaded only after the visitor
    accepts, only on public pages and sign-up; no cookieless counter for
    now. The banner exists only while `CLARITY_PROJECT_ID` is set.
  - The privacy policy lists the cookies.
- **D7 — Billing emails** keep going to the employer user for now. The
  Phase T question about `billing_email` stays open.
- **D8 — Public-sector buyers:** out of scope. Their invoices are issued by
  hand on SEF.

## 5. Needs Stefan

- **Seller data** (public in APR; Stefan will paste it in chat, and it goes
  into the Sanity seed and the legal drafts):
  - exact registered name (as in APR, usually with the town);
  - address;
  - PIB and MB;
  - RSD account number;
  - foreign-currency IBAN and SWIFT, if he takes EUR from foreign
    employers.
- **Contact for privacy requests:** an email address (e.g.
  `privatnost@sljakam.com`, or the support address).
- **Accountant, a short list (⚖ above):**
  - the non-VAT note wording;
  - required invoice fields;
  - "date of supply" for a subscription;
  - whether paying by bank transfer before the service starts needs an
    advance invoice;
  - credit note ("knjižno odobrenje") requirements for a paušalac;
  - when to move to D.O.O.
- **Lawyer:** review `docs/legal/*.md` (C1).
