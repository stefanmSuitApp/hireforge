# Staff-created employer accounts, and one uploads bucket

Plan, 2026-10-31. Owner: Claude session `hireforge-tests-b3`.

## Decisions (Stefan, 2026-10-31)

- Companies never upload their own logo or photos. Moderators and admins
  add logos, either before the company has an account or while creating it.
- A company can exist without any account (this already works:
  `source = moderator_lead`). Staff can create a company with or without
  an account, and add an account to an existing company later.
- Accounts are created by staff with an **invite link** (the person sets
  their own password), not a password chosen by staff.
- Every uploaded file goes to one private Hetzner bucket: CVs, candidate
  photos, job description images and company logos. Sanity keeps editorial
  content only (city photos, home tiles, About, the employer page's hero
  and story).
- Candidate photos are PR 5 of [`CV_TEMPLATES.md`](./CV_TEMPLATES.md)
  (optional, on `moderan` and `evropski`, JPEG because `@react-pdf` can't
  draw AVIF). That PR waits for PR 2 here and is not duplicated.

## What already exists

- Staff create a company (`POST moderator/companies`, `moderator_lead`).
- Staff move an employer to another company (`PATCH moderator/employers/:id`).
- Self-signup matching an existing company (VAT ID → tax ID → PIB → MB →
  registration number → name) creates a join request that staff approve;
  no match creates a new company.
- Single-use, hashed, row-locked auth tokens (`auth-tokens.ts`) and the
  password-reset form, page and endpoint.

## PR 1 — `feat/staff-employer-accounts`

### Behaviour

1. **Create company** (moderator form) offers PIB / MB (or the foreign
   identifiers) as optional fields. Update 2026-10-31 (Stefan): they are
   not required; matching falls back to the name, and approving the join
   request fills the company's empty fields from the sign-up.
2. **Add account** on the moderator company page: email + email language
   (sr/en).
   - Creates the user (role `employer`, no password), links them to the
     company right away (no join request), issues an invite token valid
     for 7 days and emails "Šljakam created your company account, set your
     password".
   - The page then shows the invite link with a **Copy link** button, for
     clients who don't read email or are sitting with the moderator (this
     replaces the temporary-password idea: same use, and nobody but the
     client ever knows the password; a forced change at first sign-in
     would also need a change-password screen we don't have).
   - Email already used by any account → coded error
     `STAFF_ACCOUNT_EMAIL_TAKEN`. If that person signed up on their own,
     use their join request instead.
   - Same access rule as the rest of the page: the company's moderator,
     any moderator for the lead pool, admins for all. Audited
     (`employer_account.invite`).
3. **Members list** shows each account's state: "Waiting for activation"
   (no password yet) or "Active". Waiting ones have **Resend invite**,
   which voids the old link and returns a new one (`ACCOUNT_ALREADY_ACTIVE`
   once a password exists).
4. **Accept invite** page `/{locale}/accept-invite?token=…`: new password
   twice, the sign-up legal notice, then "Activate account". It sets the
   password, marks the email verified (the link proves the mailbox),
   records the accepted terms version, signs out other sessions, and
   points to employer sign-in. An unknown, used or expired link gets the
   usual "link invalid or expired" error.
5. Several accounts per company stay allowed, as join approval already
   allows (one company per user, unchanged).

### Changes

- **DB** `drizzle/0039_auth_tokens_account_invite.sql`: the
  `auth_tokens_purpose_check` allows `account_invite`; journal entry;
  `schema.ts`.
- **API**
  - `auth-tokens.ts`: purpose `account_invite`, TTL 7 days.
  - `AuthEmailService`: `sendAccountInvite` (returns link and whether the
    email went out) and `acceptInvite(token, password, termsVersion)`.
  - `POST auth/invite/accept` (public, email-link rate limit).
  - `POST moderator/companies/:id/accounts` and
    `POST moderator/companies/:id/accounts/:userId/invite` (staff).
  - Company detail members get `activated`.
  - `staffCompanyCreateBodySchema` requires an identifier.
- **Contracts**: bodies and responses, error codes
  `STAFF_ACCOUNT_EMAIL_TAKEN`, `ACCOUNT_ALREADY_ACTIVE`,
  `COMPANY_IDENTIFIER_REQUIRED`, with `Errors.*` copy in sr and en.
- **Email**: `accountInviteMessage(locale, url, companyName)`.
- **Web**: BFF routes for the three endpoints (path params validated,
  client IP forwarded, terms version added server-side like sign-up);
  `staff-client` calls; create-form identifier fields; members list with
  state, add-account form, resend and copy link; accept-invite page
  reusing the reset-password form; copy in `messages/{sr,en}.json`.
- **Docs**: `PRODUCT_SSOT_SLJAKAM.md` permission table, `PROGRESS.md`.

### Tests

- **e2e** (written first and shown failing): a moderator creates a company
  with a PIB, adds an account, the invite reaches the fake Resend, the
  employer opens the link, sets a password, signs in and lands in that
  company's workspace; the members list then says "Active".
- **Integration** (`staff-accounts.int.test.ts`): create and link; another
  moderator's company is refused; a taken email is refused; accept works
  once and verifies the email; resend voids the old link; resend for an
  active account is refused; create without an identifier is refused.
  Route registry entries for the new routes.
- **Unit**: the create-body identifier rule; the invite email in both
  languages.
- **Checks**: `pnpm verify`, `E2E_WEB=start pnpm e2e`,
  `pnpm test:integration`; UI at 375 and 1440 px.

## PR 2 — uploads bucket, in two parts

**2a — `feat/uploads-storage` (done 2026-10-31):** `UploadStorageService`
(bucket under `S3_UPLOADS_PREFIX` when `S3_UPLOADS_BUCKET` is set, the old
disk folder otherwise; a bucket without prefix or keys refuses to boot);
CVs (uploaded and generated) go through it; `copy-uploads-to-bucket.mjs`
copies existing files (in the api image; skips what is there, deletes
nothing); staging gets `staging/`. Job description images keep their own
`S3_JOB_MEDIA_BUCKET` path for now: whether production sets it can't be
seen from the repo, and moving them blind could lose images. Billing PDFs
unchanged.

**2b — company logos (done 2026-10-31, `feat/company-logos`):** upload on
the moderator company page, the same service (area `logo`), migration 0042,
a public slug → URL map merged over Sanity's in the layout, a versioned
image route cached for a year; Sanity's logo field stays as the fallback
(remove it once every logo is uploaded here).

Original outline:

- Stefan creates the private bucket `hireforge-uploads` (nbg1) in the
  DEVLEGION project; the existing keys reach it. Keys under
  `production/…` and `staging/…`.
- One `UploadStorageService` (S3 when configured, disk otherwise, for dev
  and tests) replaces the three near-copies (CVs, job images, billing
  PDFs stay as they are unless trivial).
- CVs move from `api_var` (not backed up today) to the bucket, with a
  one-off copy script for existing files.
- Company logos: upload on the moderator company page (JPEG/PNG/WebP
  ≤ 2 MB → square, re-encoded, two sizes), `companies.logo_storage_key`,
  a public cached route; Sanity's logo stays a fallback until the field is
  removed.
- Unblocks `CV_TEMPLATES.md` PR 5 (candidate photo).
