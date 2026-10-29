# Plan — an honest empty site, and promo campaigns

Written 2026-10-29 from `main` at `7e36941`. Stefan's decisions, 2026-10-29:

- **Order:** these two first (E, then P), then account deletion (C2 in
  `LEGAL_AND_INVOICES.md`).
- **Campaigns** are public promo codes, not a site-wide switch.
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

## P — Public promo campaigns (one or two PRs)

**Data:** migration on `promo_codes`:

- `is_public boolean not null default false`;
- `is_active boolean not null default true`;
- `banner_sr` and `banner_en` (text, nullable). When empty, the banner
  text is generated from the discount: "Besplatni oglasi do {date}" /
  "{n}% popusta na pakete do {date}".

**Admin** (existing promo-codes screen):

- **"Javna kampanja" (public campaign) toggle:** at most one public
  campaign active at a time, checked on save.
- **Length presets:** "Vikend" (Friday 00:00 to Sunday 23:59), "7 dana" and
  "X dana". They fill `valid_from` and `valid_to`, in Belgrade time.
- **"Pauziraj / Nastavi"** (pause / resume) via `is_active`. The admin list
  shows the status: scheduled, running, paused or ended.

**Public side:**

- `GET /api/public/campaign`: the running public campaign (code, discount,
  end date, banner text), or null. Cached briefly; the BFF route has no
  auth.
- **Home banner:** reads that endpoint. The Sanity campaign calendar stays
  only as a fallback for non-promo announcements.
- **Packages page:** while a campaign runs, a callout ("Besplatno do
  {date}" / "−{n}% do {date}"), the code pre-filled and applied, and
  prices shown discounted. The employer can clear the code.
- **Checkout:** applies the campaign through the existing validation (the
  window, packages, per-company and total caps). An inactive or paused code
  is `PROMO_NOT_ACTIVE`.

**Free activation (`full_free`, total 0):**

- The subscription becomes `active` at once, with its start and end
  dates, and no proforma or invoice is issued.
- The redemption, an audit row `subscription.free_activation` and an
  outbox event (for the email) are recorded.
- The pinned `it.fails` in `billing-flow.int.test.ts` flips to `it`.

**Abuse limits** (the existing checks): a verified email, `max_per_company`
(default 1 for public campaigns), an optional package restriction, and an
optional total cap.

**Tests:**

- Integration:
  - free activation with no documents;
  - pause gives `PROMO_NOT_ACTIVE`;
  - only one public campaign;
  - the public endpoint is empty outside the window.
- e2e:
  - an admin starts a weekend campaign and the home banner shows it;
  - an employer buys at 0 and can post right away;
  - after the end time the banner is gone.
- Unit: the length presets in Belgrade time across DST.

## Open (⚖ accountant)

Whether a free activation needs a zero-value invoice. Until they answer,
none is issued.
