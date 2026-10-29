# Plan — an honest empty site, and promo campaigns

Written 2026-10-29 from `main` at `7e36941`. Stefan's decisions, 2026-10-29:

- **Order:** these two first (E, then P), then account deletion (C2 in
  `LEGAL_AND_INVOICES.md`).
- **Two kinds of discount** (Stefan, 2026-10-29, second answer):
  - **Promo codes stay private.** They are typed at checkout, handed out
    through influencers, ads and sales, and **never advertised on the
    site**.
  - **Campaigns are public and automatic:** a free week or weekend, or a
    percentage off. They show in the home banner and apply without typing,
    have a length in days, and can be paused.
- **A free activation** issues no proforma or invoice; only the redemption
  and the audit entry are recorded, until the accountant says otherwise.
- **The banner** must show automatically for any public campaign: a free
  week, a free weekend, or a percentage off.

## The problem (production, empty database)

1. **Fake banner.** The home banner advertised "Nedelja besplatnih oglasa".
   It was a seeded Sanity slot dated 2026–2030, tied to no real promo code.
   Ended in Sanity on 2026-10-29 at 13:20 UTC.
2. **Jobs pages blame the filters.** City and category landing pages always
   use the "no jobs for these filters" text, even when the whole site has
   no jobs.
3. **No first-job path for employers.** The dashboard is static. "Dodaj
   oglas" leads to Packages without explaining the steps: verify email →
   package → payment confirmed → write the ad → moderation.

## E — Empty site (one PR)

- **Seed:**
  - `scripts/cms/seed-sanity.mjs` no longer creates the fake slot.
  - The campaign calendar is seeded empty.
- **Site-wide emptiness:** "no live jobs anywhere" comes from the existing
  public sitemap data (`liveJobs` / `jobs.length`), so no new endpoint.
- **`/jobs` and landing pages, when the site has 0 live jobs:**
  - Title "Šljakam tek počinje" with a short body: the first ads are on the
    way.
  - For employers and guests, the main action is "Objavi prvi oglas"
    (signed out: register as employer; employer: the first-job path).
  - For candidates: "Napravi nalog i pripremi CV" (create an account and
    get your CV ready).
  - Filter-specific copy only when the site has jobs and the filters
    exclude them.
- **Home, when there are no jobs:**
  - A "Budi među prvim poslodavcima" (be among the first employers)
    section, with the same calls to action, where the job strips would be.
  - The job strips stay hidden, as today.
- **Employer dashboard:**
  - A "Prvi oglas" checklist, built from the employer's real state: email
    verified, package chosen, payment confirmed (or proforma waiting), ad
    written, in moderation, published.
  - Each step links to where it is done.
  - The checklist hides once a job has been published.
- **Tests:**
  - e2e (the e2e database starts empty):
    - `/sr/jobs` and a landing page show the "tek počinje" copy, not the
      filter copy;
    - a new employer sees the checklist with "verify email" first;
    - after a job is published, the normal list returns.
  - Unit: the checklist state mapping.

## P — Public campaigns, next to private promo codes

**Two kinds, one table.** `promo_codes` gains `kind`:

- **`code`** (today's rows): private and typed. Never shown on the site:
  no banner, no hint, no pre-fill.
- **`campaign`:** public and automatic.
  - No typing: its `code` is generated (e.g. `KAMPANJA-20261107`) only to
    tie redemptions and audit rows to it, and it is never shown.
  - Discount: `full_free` or `percent`. No fixed amounts, which would need
    a currency per campaign.

Both kinds reuse the existing window, package, per-company and total-cap
checks and the redemption records.

**Data:** one migration on `promo_codes`:

- `kind text not null default 'code'`, with a check `code | campaign`;
- `is_active boolean not null default true`: pause and resume, for both
  kinds;
- `banner_sr` and `banner_en` (text, nullable, campaigns only). When empty,
  the banner says "Besplatni oglasi do {date}" or "{n}% popusta na pakete
  do {date}".
- **No overlap:** two active campaigns may not have overlapping windows
  (checked on save, under a lock).

**Admin:**

- **A new "Kampanje" screen**, separate from "Promo kodovi" so the two are
  never confused. Fields:
  - name (internal);
  - free or percent, and the value;
  - packages (default all);
  - start;
  - length: "Vikend" (Friday 00:00 to Sunday 23:59), "7 dana" or "X dana",
    in Belgrade time; this sets `valid_from` and `valid_to`;
  - optional banner text in sr and en;
  - optional total cap. One use per company is the default.
- **Status list:** scheduled, running, paused or ended, with "Pauziraj" and
  "Nastavi" buttons.
- **"Promo kodovi":** gains the same pause button. Campaigns don't appear
  there.

**Public side:**

- `GET /api/public/campaign` returns the running campaign (discount, end
  date, banner text), or null. It never includes a code.
- **Home banner:** reads that endpoint. The Sanity campaign calendar stays
  only for non-promo announcements.
- **Packages page:** while a campaign runs, a callout ("Besplatno do
  {date}" / "−{n}% do {date}") and discounted prices. Nothing to type.
- **Checkout** (server side, never trusting the browser):
  - with no typed code, the running campaign applies automatically if the
    package qualifies;
  - with a valid typed private code too, the employer gets **the lower
    price of the two, never both**;
  - a paused code or campaign is `PROMO_NOT_ACTIVE`.

**Free activation (total 0, from a free campaign or a private
`full_free` code):**

- The subscription becomes `active` at once, with its start and end dates.
  No proforma or invoice is issued.
- The redemption and an audit row `subscription.free_activation` are
  recorded. The employer goes straight to the job composer.
- **Not built yet:** a confirmation email for a free activation; it needs
  a worker template.
- The pinned `it.fails` in `billing-flow.int.test.ts` flips to `it`.

**Abuse limits:** a verified email, one use per company per campaign, the
package restriction, and the optional total cap.

**Tests:**

- Integration:
  - a campaign applies with no code;
  - the lower of campaign and typed code wins, never both;
  - a free activation has no documents;
  - paused gives `PROMO_NOT_ACTIVE`;
  - overlapping campaigns are refused;
  - the public endpoint is empty outside the window and never contains a
    code;
  - a private code never shows up publicly.
- e2e:
  - an admin starts a weekend campaign and the home banner and the
    packages callout appear;
  - an employer buys at 0 and can post right away;
  - pausing removes the banner.
- Unit: the length presets in Belgrade time, across DST.

## Open (⚖ accountant)

Whether a free activation needs a zero-value invoice. Until they answer,
none is issued.
