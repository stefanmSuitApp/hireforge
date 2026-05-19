# SLJAKAM — Product & Operations Source of Truth

Single source of truth for **what we build, why, and how it behaves** for the
**Sljakam.com** platform. This document is **product-first**. The technical
companion is `PROJECT_SSOT.md` (architecture, stack, infra). Execution
breakdown is `docs/refactor/MIGRATION_PLAN.md`.

**Audience:** product, engineering, design, sales, ops.
**Edit when reality changes.** Never let the document drift from shipped behavior.

> **Brand split (locked):**
>
> - **Display brand** in every user-facing surface (logo, headers, page
>   titles, page meta, OG / Twitter tags, email "From" name, transactional
>   templates, in-app copy, marketing pages): **Šljakam** (with diacritic).
> - **ASCII brand** in every technical surface (domain, URLs, email
>   addresses, slugs, identifiers, repo / package names, file paths, env
>   vars, search keywords): **sljakam** (no diacritic).
> - **Domain (owned):** `sljakam.com`.
> - The repository codename (`hireforge`) and internal package names are
>   kept as-is — **no rename**.

---

## 0. How to use this document

| Section                   | Read when…                                |
| ------------------------- | ----------------------------------------- |
| 1 — Brand & positioning   | onboarding, marketing, copy reviews       |
| 2 — Scope (in / out)      | scoping new work, fighting scope creep    |
| 3 — Personas              | UX decisions, copy decisions              |
| 4 — Roles & permissions   | API guards, UI gating                     |
| 5 — Domain model          | DB / contract changes                     |
| 6 — Package model         | billing, gating, CMS edits                |
| 7 — Job lifecycle         | moderation, publishing, expiry            |
| 8 — Apply flows           | candidate UX, ATS-lite                    |
| 9 — CV & profile          | candidate signup, templates               |
| 10 — Billing              | proforma, invoice, refunds, GDPR          |
| 11 — Sales ownership      | moderator + admin tooling                 |
| 12 — Promo codes          | growth campaigns                          |
| 13 — Localization         | copywriting, CMS authoring                |
| 14 — Operating principles | every PR (non-negotiable gates)           |
| 15 — State machines       | implementing transitions                  |
| 16 — KPIs                 | dashboards, reporting                     |
| 17 — Out-of-scope (P2/P3) | rejecting feature requests politely       |
| 18 — Decisions log        | history of why something is the way it is |
| 19 — Glossary             | terminology disputes                      |

---

## 1. Brand & positioning

### 1.1 Core idea

**Šljakam** (technically `sljakam.com`) is a platform that connects employers
with people looking for work **fast and simply**, without barriers and without
charging candidates.

#### 1.1.1 Brand split rule (must follow on every change)

| Surface                                                           | Use this        | Example                                    |
| ----------------------------------------------------------------- | --------------- | ------------------------------------------ |
| Logo, header, footer                                              | **Šljakam**     | logo wordmark                              |
| Page titles, `<title>`, `og:site_name`, `og:title`                | **Šljakam**     | `Konobar — Šljakam`                        |
| Meta description, Twitter card                                    | **Šljakam**     | brand recognition                          |
| Email "From" display name                                         | **Šljakam**     | `Šljakam <noreply@sljakam.com>`            |
| Email subject lines, body                                         | **Šljakam**     | "Tvoj oglas je objavljen na Šljakam"       |
| In-app body copy, buttons, toasts                                 | **Šljakam**     | "Prijavi se na Šljakam"                    |
| Marketing pages and CMS strings                                   | **Šljakam**     | Sanity localized fields                    |
| Domain                                                            | `sljakam.com`   | URL bar, all links                         |
| Email addresses                                                   | `*@sljakam.com` | `support@sljakam.com`                      |
| Slugs and URL path segments                                       | ASCII           | `sljakam.com/sr/jobs/konobar-novi-sad-a3f` |
| Internal identifiers (env vars, code, package names, S3 prefixes) | `sljakam`       | `SLJAKAM_API_URL`                          |
| Search-ranking keywords / `keywords` meta                         | both            | `Šljakam, sljakam` (covers both queries)   |
| Slogan / tone                                                     | both work       | "Šljakam za posao"                         |

**Rationale:** preserves brand recognition with the diacritic in display
contexts, while keeping the ASCII form for SEO discoverability, link sharing,
and technical interop (no URL encoding, no email-client quirks, no character
escaping in code).

### 1.2 Positioning vs Infostud (Poslovi)

| Dimension | Infostud (legacy portal)           | Sljakam (us)                                             |
| --------- | ---------------------------------- | -------------------------------------------------------- |
| Tone      | Formal, corporate                  | Direct, plain Serbian (**not** unprofessional)           |
| Speed     | Many steps, dense forms            | ≤ 3 steps to apply, ≤ 3 steps to post                    |
| Pricing   | High, bundled                      | Transparent four-tier ladder, predictable                |
| Audience  | White-collar bias                  | **Mass market** — trades, hospitality, logistics, retail |
| Channels  | Web-first, slow social             | **Aggressive FB / IG distribution**                      |
| UX target | Recruiters who tolerate complexity | Mechanic and accountant must equally succeed             |

### 1.3 Voice & tone

- Direct. Plain Serbian / plain English.
- Verb-led CTAs (`Prijavi se`, `Pošalji oglas`, `Sačuvaj`), not nouns.
- No “molimo Vas”, no “portal”, no “klijent” in user-facing copy.
- Numbers over fuzzy phrases (“Ostalo 5 dana”, not “Ističe uskoro”).
- Empty states guide the user to the next concrete action.

### 1.4 Core promises

- **Candidates:** “Tražiš posao? Nađi ga odmah.” Always free.
- **Employers:** “Tražiš radnike? Dobij ih brzo.” Predictable pricing, fast publish, real distribution.

### 1.5 Design reference: Glassdoor-style UX

Infostud is the **competitor** (the market we are taking share from).
**Glassdoor** (`glassdoor.com`) is our **UX design reference** — we model the
candidate-facing discovery experience after their patterns, adapted to the
Serbian mass-market and the SSOT operating principles (§14).

Treat this as a checklist when designing or reviewing public surfaces.

#### 1.5.1 Patterns we adopt

| Pattern                                                                                                                                   | Where it shows up                  |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Search-first home page** with a single prominent search bar (title + location), with category and salary as secondary chips below       | `/{locale}`                        |
| **Two-column results layout** on desktop: scrollable list on the left, selected job preview on the right (kept in sync via URL state)     | `/{locale}/jobs`                   |
| **Single-column results** on mobile, with full-screen detail navigation                                                                   | `/{locale}/jobs` (≤ md viewport)   |
| **Filter chips bar** above the list: salary range, work model, employment type, post date, "Easy Apply" toggle, "Salary disclosed" toggle | `/{locale}/jobs`                   |
| **Sticky apply CTA** on the job detail panel (always visible while scrolling)                                                             | detail pane                        |
| **"Easy Apply" badge** on `apply_mode = internal` jobs, distinct CTA copy versus external links                                           | listings + detail                  |
| **Salary range prominent** on listing cards (when disclosed); "Salary disclosed" filter chip                                              | listings                           |
| **Compact company snapshot card** on every job detail (logo, name, location, link to company page)                                        | detail                             |
| **"Similar jobs"** section at the bottom of every job detail (FTS-driven content-based recall)                                            | detail                             |
| **Saved jobs** with a login wall on the bookmark icon for anonymous users                                                                 | listings + detail                  |
| **Apply tracker** in candidate dashboard: list of all applications with status badges, "withdraw" action                                  | `/{locale}/candidate/applications` |
| **Recently viewed jobs** strip on home and dashboard for logged-in candidates                                                             | `/{locale}` (logged-in)            |
| **Job alerts** for a saved search (P1 backlog, but design surfaces from MVP day 1)                                                        | `/{locale}/jobs` (button)          |
| **Filter URL state** that is shareable and SEO-friendly                                                                                   | every list view                    |
| **Empty / error states** that always offer a next action (broaden filters, clear filters, browse popular categories)                      | listings                           |
| **Skeleton + streaming SSR**, never blank-screen waits                                                                                    | every public route                 |

#### 1.5.2 Patterns we deliberately do **not** adopt (out of MVP scope)

- **Anonymous employer reviews** and 5-star ratings — out of scope for MVP
  (legal / moderation cost too high for our team size).
- **Interview experiences** crowdsourced content.
- **CEO approval ratings**, "Best places to work" awards, and editorialised
  rankings.
- **"Know Your Worth" salary calculator** as a personalised tool — we ship
  honest **salary range disclosure** instead of a calculator.
- **Heavy social-proof modals** (e.g. "X people applied today") — clashes with
  our anti-feature list (§2.3).

#### 1.5.3 What this means in practice

- The **public discovery redesign** (covered in `MIGRATION_PLAN.md` Step 15)
  replaces the dense Infostud-style listing with a Glassdoor-style two-column
  experience on desktop, mobile-optimised single-column on phones.
- Every new feature for candidates is reviewed against the §1.5.1 checklist
  before shipping.

---

## 2. Scope

### 2.1 MVP scope (in)

- Public job discovery (search, list, detail, company page) for anonymous users.
- Candidate sign-up, profile, CV management (1 active CV in MVP), apply flow.
- Employer self-registration, package selection, job posting, moderation, payment.
- Moderator + admin back-office (queue, company management, sales ownership).
- Subscription model with four packages (CMS-authored, snapshotted at purchase).
- Auto-expiry of jobs based on subscription duration.
- Foreign companies as billing recipients (EUR invoicing, EU VAT / non-EU tax IDs).
- Promo codes incl. category-targeted “free week” campaigns.
- Bilingual content (`sr`, `en`) — Latin script only.
- Manual social posting workflow (FB / IG copy-paste from internal dashboard).
- 3 candidate CV PDF templates generated server-side.

### 2.2 Explicitly out of MVP (P2 / P3)

- SEF (Serbian e-faktura state system) integration. PDV (VAT) charging on invoices is **deferred**; documents are issued without VAT in MVP. Configurable flag exists to flip later.
- Automated Meta Graph API publishing to FB / IG.
- VIES EU VAT validation (manual entry only in MVP).
- Cyrillic script switcher (Latin only).
- Multi-CV per candidate (schema scalable; service-layer locks to 1 CV in MVP).
- Multi-company per single user (schema scalable; service-layer locks to 1:1 in MVP).
- Multi-user per company (team workspaces).
- Social authentication (Google / LinkedIn).
- SMS / WhatsApp notifications.
- Native mobile apps.
- AI features (CV summaries, matching, ranking).
- Salary intelligence / benchmarking.

### 2.3 Anti-features (will not ship)

The following are decided as **not ours** for the foreseeable future:

- Multi-step wizards with progress indicators for apply (single-screen apply only).
- Drawers inside drawers / nested modals.
- Floating action buttons on public routes.
- Auto-play hero video.
- Newsletter / cookie pop-ups.
- Forced post-login coachmarks / tutorials.
- AI chatbot widgets.
- “Are you sure?” modals for actions that can be undone.
- High-density Infostud-style tables.

---

## 3. Personas

### 3.1 Mechanic (candidate, mass-market)

- Mostly mobile (mid-tier Android), often shared phone.
- Limited daily email use.
- Wants quick local matches and minimum typing.
- Time-to-first-apply target: **< 90 s** from cold landing.

### 3.2 Bookkeeper (candidate, white-collar)

- Mostly desktop, expects power filters (experience level, employment type).
- Maintains a polished CV; willing to fill profile.
- Comfortable with structured forms.

### 3.3 Restaurant owner (employer, TEZGA)

- Mobile-first, posts from phone.
- Wants the cheapest path to “job is live”. Time-to-first-publish target: **< 5 min**.
- Will not maintain long company bios.

### 3.4 HR generalist (employer, ŠEF / GAZDA)

- Desktop power user, multiple postings, brand-conscious.
- Wants applicant tracking basics, branded company page, analytics.

### 3.5 Sales (moderator, internal)

- Field rep adding leads from the road.
- Owns relationships; ownership lock is a contractual expectation.

**PR rule (mandatory check):** every UI change must pass _both_ the
**mechanic** and the **bookkeeper** persona check.

---

## 4. Roles & permissions

| Action                                      |           Candidate           |                 Employer                  |         Moderator         |             Admin             |
| ------------------------------------------- | :---------------------------: | :---------------------------------------: | :-----------------------: | :---------------------------: |
| Browse public jobs / companies              |              yes              |                    yes                    |            yes            |              yes              |
| Apply to job (internal mode)                | **yes** (logged in, verified) |                     —                     |             —             |               —               |
| Open external apply URL                     |              yes              |                    yes                    |            yes            |              yes              |
| Self-register company                       |               —               | **yes** (PIB + MB or VAT/Tax ID required) |             —             |               —               |
| Create company as sales lead                |               —               |                     —                     |          **yes**          |              yes              |
| Pickup `unassigned` / `closed_lost` company |               —               |                     —                     |          **yes**          |              yes              |
| Reassign company ownership                  |               —               |                     —                     |            no             | **yes (admin only, audited)** |
| Mark proforma paid (TEZGA / ŠLJAKA / ŠEF)   |               —               |                     —                     |          **yes**          |              yes              |
| Activate Enterprise (GAZDA) subscription    |               —               |                     —                     |          **no**           |     **yes (admin only)**      |
| Create job ad on behalf of company          |               —               |                     —                     | **yes** (non-Enterprise)  |              yes              |
| Save draft                                  |           yes (n/a)           |                  **yes**                  | **yes** (for any company) |              yes              |
| Submit job for review                       |               —               |                  **yes**                  |          (auto)           |            (auto)             |
| Direct publish (bypass review)              |               —               |                  **no**                   |          **yes**          |            **yes**            |
| Approve / reject submitted job              |               —               |                     —                     |          **yes**          |              yes              |
| Force-archive live job                      |               —               |                     —                     |            no             |            **yes**            |
| Edit live job (triggers re-review)          |               —               |                 yes (own)                 |            yes            |              yes              |
| Trivial patch publish (admin override)      |               —               |                     —                     |            no             |       **yes (audited)**       |
| Manage CMS packages, prices, copy           |               —               |                     —                     |        (CMS role)         |          (CMS role)           |
| Create / disable staff users                |               —               |                     —                     |            no             |            **yes**            |
| View staff audit log                        |               —               |                     —                     |       (own actions)       |        **yes (full)**         |

> Direct-publish events, trivial patch publishes, ownership reassignments, paid
> markings, and Enterprise activations **always** write to `staff_audit_log`.

---

## 5. Domain model

This section names the entities and the invariants. Concrete column lists for
new tables/columns live in `docs/refactor/MIGRATION_PLAN.md`.

### 5.1 Entities

- `users` — single account, role enum (`candidate | employer | moderator | admin`).
- `candidates` — 1:1 with `users` of role `candidate`.
- `employers` — link from `users` (role `employer`) to a `company`.
  - **MVP invariant:** one employer row per `(user_id, company_id)` pair, plus a service-layer rule that allows only **one row per `user_id`**. The composite unique on `(user_id, company_id)` ships from day 1 so P2 multi-company unlocks without migration.
- `companies` — domestic or foreign organisation that buys subscriptions.
- `subscriptions` — a paid (or admin-activated) entitlement package owned by a `company`.
- `jobs` — a job ad owned by a `company`, optionally linked to a `subscription`.
- `applications` — a candidate’s submission to an `internal`-mode job.
- `resume_assets` — uploaded or generated CVs owned by a `candidate`.
- `proformas`, `invoices` — billing documents tied to subscriptions.
- `promo_codes`, `promo_redemptions` — growth campaign primitives.
- `packages`, `package_prices`, `package_entitlements` — runtime mirror of CMS.
- `staff_audit_log`, `company_assignments_history`, `outbox_events`, `outbox_dead_letters` — already exist; extended.

### 5.2 Invariants (must always hold)

1. A `company` has at most one **active** `subscription` at a given time.
2. A `subscription` snapshots package price + entitlements at purchase. Later
   CMS edits **never** retroactively change an existing subscription.
3. `jobs.expires_at = jobs.published_at + subscription.duration_days_snapshot`
   (UTC). Set on first transition to `live`. Edits do not reset it.
4. A `closed_won` company can be reassigned **only** by an `admin`.
5. PIB and MB are unique **when present** (partial unique index, NULL allowed).
   VAT ID is unique when present. Tax ID is not unique (foreign jurisdictions
   reuse formats).
6. `applications` are **immutable snapshots** — even if the candidate later
   deletes their CV, the application keeps the file pointer and metadata at
   submission time.
7. Editing a `live` job demotes it back to `pending` automatically (admin-only
   trivial patch publish is the audited exception, see §7.4).

### 5.3 Companies (domestic + foreign)

A `company` is the billing party. The `is_foreign` flag drives all conditional
validation. Concrete columns and indexes are in the migration plan.

| Field                                                                |     RS company     |           EU company           |   Non-EU company   |
| -------------------------------------------------------------------- | :----------------: | :----------------------------: | :----------------: |
| `legal_name`                                                         |      required      |            required            |      required      |
| `country_code` (ISO-3166)                                            |        `RS`        |        DE / IT / AT / …        |  US / CH / UK / …  |
| `pib` (8 digits)                                                     | **required (app)** |               —                |         —          |
| `mb` (8 digits)                                                      | **required (app)** |               —                |         —          |
| `vat_id` (e.g. `DE123456789`)                                        |         —          |       **required (app)**       |         —          |
| `tax_id` (foreign tax authority)                                     |         —          |               —                | **required (app)** |
| `registration_number` (companies house etc.)                         |      optional      |          recommended           |    recommended     |
| Address (street, postal code, city, region, country)                 |      required      |            required            |      required      |
| Bank details (`bank_name`, `iban`, `swift_bic`, `bank_country_code`) |      optional      | required (international wires) |      required      |
| `billing_email`, `billing_contact_name`                              |      required      |            required            |      required      |
| `invoice_currency`                                                   |   RSD (default)    |              EUR               |     EUR / USD      |
| `invoice_language`                                                   |         sr         |            sr / en             |         en         |
| `vat_treatment`                                                      |  `rs_standard_20`  |      `rs_reverse_charge`       | `rs_export_no_vat` |

> **DB shape:** every column above is **nullable**, because moderators create
> sales leads without full data. The application enforces conditional “required”
> rules by `is_foreign` + `country_code` only when a real human submits the
> form (self-signup or full edit).

### 5.4 Company self-signup upsert

When a candidate creates the **employer** account, the system runs an upsert
match against existing `companies` rows, in this priority order:

1. `vat_id` (if provided, EU)
2. `tax_id` (if provided, non-EU)
3. `pib`
4. `mb`
5. `(registration_number, country_code)`
6. `(normalize(legal_name), country_code)` — strict normalization (lowercase, trim, collapse whitespace, strip punctuation, strip suffixes like `d.o.o.`, `a.d.`, `ltd`, `gmbh`).

**Rules:**

- A match merges the self-signup user **into the existing company row** and
  updates only fields the moderator left empty. Existing values are not
  overwritten.
- The existing `assigned_moderator_id` and `sales_status` are preserved.
- If no match, a new `companies` row is created with `source = self_signup`
  and `sales_status = unassigned`.
- A duplicate cannot be created later: PIB / MB / VAT ID partial unique
  indexes guarantee it.

### 5.5 Sales ownership

`companies` carries:

- `sales_status`: `unassigned | pipeline | closed_won | closed_lost`.
- `assigned_moderator_id` (nullable user id).
- `closed_won_at`, `closed_lost_at` timestamps.
- `source`: `self_signup | moderator_lead | admin_lead`.

Pickup rules:

- Any moderator may pickup an `unassigned` or `closed_lost` company.
- A `closed_won` company is **locked**: only an `admin` can reassign it,
  and the change is recorded in `company_assignments_history`.
- A `pipeline` company is locked to its current owner; another moderator
  cannot steal it.

`employer` dashboard (“Vaš kontakt za oglase”):

- Shows the assigned moderator’s name, email, phone (from `users` row).
- Falls back to generic support contact (from CMS `siteSettings`) when the
  company is `unassigned`.

### 5.6 Subscriptions

A `subscription` is the only thing that authorises publishing a job ad. It
snapshots package details at purchase to make CMS edits side-effect free.

| Field                       | Notes                                                    |
| --------------------------- | -------------------------------------------------------- | ------ | ------- | ---------- |
| `package_code`              | stable identifier (`tezga` / `sljaka` / `sef` / `gazda`) |
| `duration_days`             | snapshot                                                 |
| `price_minor`, `currency`   | snapshot at purchase (or admin override for Enterprise)  |
| `entitlements_json`         | snapshot of package_entitlements blob (see §6.3)         |
| `status`                    | `pending_payment                                         | active | expired | cancelled` |
| `starts_at`, `ends_at`      | period the subscription is valid for                     |
| `enabled_by_user_id`        | who marked paid / activated                              |
| `enterprise_admin_unlocked` | `true` only for GAZDA, only set by admin                 |
| `proforma_id`, `invoice_id` | back-references                                          |

Slot accounting (for Enterprise / multi-job packages):

```
active_count(subscription) = count(jobs where subscription_id = X
                                      and status in ('pending', 'live'))
```

A `submit` or `direct publish` is **rejected** if
`active_count >= entitlements_json.max_active_jobs`.

### 5.7 Jobs

Lifecycle states (stored in `job_status` enum, already present):
`draft | pending | live | rejected | archived | expired`.

Key columns added:

- `subscription_id` (nullable for legacy rows).
- `slug` (unique within published) — for SEO URLs.
- `apply_mode` (`internal | external`).
- `external_apply_url` (required when `apply_mode = external`, must be
  `https://`, validated against domain rules).
- `description_doc` (jsonb, ProseMirror canonical).
- `description_html` (sanitized HTML for render).
- `description_plain` (plain text, used for FTS + char-count limits).
- `primary_language` (`sr | en`) — declared by author.
- `featured` (bool, derived from package entitlements).
- `crossborder_visible` (bool, derived from package entitlements).
- `external_apply_clicks` (counter, employer analytics for external mode).
- `published_at`, `expires_at`, `archived_at`, `submitted_at`, `rejected_reason`
  (most already exist).

#### 5.7.1 Employer job authoring — navigation and eligibility (UX)

These rules apply to the employer dashboard route that starts a new listing
(e.g. `/{locale}/employer/jobs/new`) and to the primary nav entry (“New
listing” / equivalent).

- **Single composer:** One job form for all packages. Package tier only changes
  **allowed capabilities** (editor tooling, limits, validation) via the
  subscription’s entitlements snapshot — not a separate wizard or screen per
  tier.
- **Nav always actionable:** The “New listing” entry stays **enabled**. Do not
  use a disabled tab or button without an explicit reason and next step (reads as
  a broken UI).
- **Same URL for ineligible users:** Visiting the new-listing route when the
  company cannot open another posting shows a **full-page empty state** (not a
  half-loaded form and not a silent redirect to packages). Copy explains **why**
  posting is blocked; **primary CTA** is obvious:
  - **No active subscription** (expired / cancelled / never purchased): CTA to
    **`/{locale}/employer/packages`** (optional `next=/…/employer/jobs/new`
    return path after purchase flow).
  - **`pending_payment` only:** Primary CTA to **complete payment** (proforma /
    billing path).
  - **Active subscription but at slot limit** (`active_count >= max_active_jobs`
    per §5.6): Explain capacity; link to **listings** to manage or archive ads,
    and to **packages** / support if upgrades apply.
- **Eligible user:** Show the normal drafting experience (auto-save, single
  screen where possible; aligns with §14.3).
- **Eligibility changes while editing:** If a draft already exists and the
  company later loses capacity or subscription, keep the user oriented: **banner**
  - block **submit** (and **save** if the API forbids writes); copy matches the
    same buckets above.
- **Strings:** Empty-state and error copy for these buckets live in
  `apps/web/src/messages/{sr,en}.json` and should match API error semantics so
  support and users see one story.

### 5.8 Applications

Only meaningful for `apply_mode = internal` jobs.

- `application_status` enum: `submitted | viewed | shortlisted | rejected | withdrawn | hired`.
- Stores `cover_letter_text` (≤ 1500 chars plain, optional).
- Stores `resume_asset_id` (snapshot reference; if the candidate later deletes
  the asset, the application keeps a hard-copied filename + storage key).
- Rate limit: max 50 submissions / 24 h per candidate (anti-bot).
- Per (candidate, job) uniqueness: at most one **non-withdrawn** application.

### 5.9 CV / resume

- `resume_assets` already supports many CVs per candidate. **MVP service rule:**
  one row marked “primary”; UI only shows one. P2 unlocks multi-CV.
- A CV can be `uploaded` (PDF / DOCX, ≤ 5 MB) or `generated` (built from
  candidate profile via one of three templates).
- Generation pipeline: server-side `@react-pdf/renderer`, template metadata
  (name, hero image, sample preview) lives in Sanity, layout code in
  `libs/server/cv-templates`. Three initial templates: `klasican`, `moderan`, `minimalan`.

### 5.10 Promo codes

Single table, generic enough for the “Nedelja besplatnih oglasa” campaign.

| Field                    | Notes                         |
| ------------------------ | ----------------------------- | ----- | ---------- |
| `code` (unique)          | human-readable                |
| `discount_type`          | `percent                      | fixed | full_free` |
| `value`                  | amount (minor) or percentage  |
| `valid_from`, `valid_to` | UTC                           |
| `applicable_packages`    | array of `package_code`       |
| `applicable_categories`  | array of `job_category` slugs |
| `max_redemptions`        | global cap                    |
| `max_per_company`        | per-company cap               |
| `redemptions_count`      | current usage                 |

Redemption is recorded in `promo_redemptions` (`code`, `company_id`,
`subscription_id`, `redeemed_at`).

---

## 6. Package model

### 6.1 Catalogue (MVP)

Stable DB codes (do **not** change once shipped):

| Tier | DB code  | Public name (SR — Latin) | Public name (EN) | Positioning                                             |
| :--: | -------- | ------------------------ | ---------------- | ------------------------------------------------------- |
|  1   | `tezga`  | TEZGA                    | TEZGA            | Quickest, cheapest entry                                |
|  2   | `sljaka` | ŠLJAKA                   | ŠLJAKA           | Real reach: more cities + FB / IG distribution          |
|  3   | `sef`    | ŠEF                      | ŠEF              | Featured + PNG creative + paid social ads               |
|  4   | `gazda`  | GAZDA                    | GAZDA            | Enterprise: custom price, multiple ads, admin-activated |

Public names live in CMS and can change without code changes; the DB code is
the only stable handle.

### 6.2 Pricing baseline (CMS-editable)

Indicative starting prices. Sales / marketing edits in Sanity without deploys.

| Tier   | 15 days |           30 days           |
| ------ | :-----: | :-------------------------: |
| TEZGA  | 30 EUR  |           37 EUR            |
| ŠLJAKA | 40 EUR  |           47 EUR            |
| ŠEF    |    —    |           55 EUR            |
| GAZDA  |    —    | custom (admin per contract) |

### 6.3 Entitlements

Mirrored from Sanity into `package_entitlements` (key / JSON value). Each
subscription **snapshots** the full entitlements blob at purchase.

| Capability                                                   |     TEZGA     | ŠLJAKA  |    ŠEF    |         GAZDA         |
| ------------------------------------------------------------ | :-----------: | :-----: | :-------: | :-------------------: |
| `max_active_jobs`                                            |       1       |    1    |     3     | custom (10 / 20 / 50) |
| `max_cities`                                                 |       1       |    3    | unlimited |       unlimited       |
| `max_characters` (plain text)                                |      400      |  4 000  |   8 000   |  20 000 (or custom)   |
| `featured_listing`                                           |      no       |   no    |  **yes**  |          yes          |
| `png_creative` (image upload)                                |      no       |   no    |  **yes**  |          yes          |
| `social_publish` (FB / IG copy from internal dashboard)      |      no       | **yes** |    yes    |          yes          |
| `paid_social_ads` (FB / IG paid distribution)                |      no       |   no    |  **yes**  |          yes          |
| `crossborder_visible` (foreign reach in listings + paid ads) |      no       |   no    |    yes    |        **yes**        |
| Editor: `bold`, `italic`, `underline`                        |      no       |   yes   |    yes    |          yes          |
| Editor: `headings`, `lists`                                  |      no       |   yes   |    yes    |          yes          |
| Editor: `blockquote`                                         |      no       |   no    |    yes    |          yes          |
| Editor: `inline_code`, `code_block`                          |      no       |   no    |    yes    |          yes          |
| Editor: `text_align`                                         |      no       |   no    |    yes    |          yes          |
| Editor: `image_upload`                                       |      no       |   no    |  **yes**  |          yes          |
| Editor: `embed` (iframe)                                     |      no       |   no    |    no     |          yes          |
| Editor: `hyperlinks`                                         |    **yes**    |   yes   |    yes    |          yes          |
| `hyperlinks_max_count`                                       |       1       |    3    |     5     |          10           |
| Editor: `custom_html`                                        | always **no** |   no    |    no     |          no           |

### 6.4 CMS ↔ DB hybrid (chosen pattern)

Sanity is the **authoring source of truth** for human-editable fields. The
runtime path is Postgres mirror tables, kept in sync by a webhook handler.

```
Sanity (authoring)
  └─ package documents (code, names sr/en, prices, entitlements, copy)
        │  publish webhook
        ▼
Nest sync service
  └─ upserts packages, package_prices, package_entitlements
        │
        ▼
Postgres (runtime)
  └─ subscriptions reference package_code (stable FK)
  └─ subscriptions snapshot full entitlements blob at purchase
```

Why hybrid (and not pure CMS or pure DB):

- Pure CMS — every read goes through Sanity SDK; no SQL joins for
  `subscriptions × package`; risky for transactional gating.
- Pure DB — duplicates a CMS we already run; editors lose flexibility.
- Hybrid — editors keep Studio, runtime stays fast, transactional gating works.

Synced metadata is read-only in the back-office UI. `staff_audit_log` records
each webhook-triggered upsert with `actor = 'cms_webhook'`.

### 6.5 Hyperlink anti-spam rules (enforced server-side)

Hyperlinks are available to all packages, but the editor enforces:

- `https://` only.
- Per-package `hyperlinks_max_count` (see §6.3).
- Domain blocklist (CMS-managed; default seeded list of porn / gambling /
  malware feeds + URL shorteners blocked for TEZGA and ŠLJAKA).
- Domain allowlist override (CMS-managed; rare).
- Anchor text required on TEZGA-tier package (no naked URLs).
- No link in the first 50 plain-text characters of the description (anti-spam).
- All rendered links use `rel="nofollow noopener ugc"` and `target="_blank"`.

### 6.6 Editor (rich text)

- **Library:** TipTap (ProseMirror-based).
- **Canonical storage:** ProseMirror JSON in `jobs.description_doc`.
- **Render:** server-side sanitised HTML in `jobs.description_html`.
- **FTS / counting:** plain-text projection in `jobs.description_plain`.
- **Loading:** `next/dynamic` lazy import in employer / moderator routes only;
  public bundle never includes TipTap.
- **Server validation:** every submit / publish revalidates the document
  against the package’s capability snapshot. Capabilities not allowed are
  stripped or the call is rejected with a typed error
  (`EDITOR_CAPABILITY_DENIED`).
- **Char count:** based on `description_plain`, not markup length.

---

## 7. Job ad lifecycle

### 7.1 States

`draft → pending → live → expired`
plus side branches `pending → rejected`, `live → archived` (admin force),
and re-entry from `expired`/`rejected` only via a new draft + new
subscription if the current period has lapsed.

### 7.2 Who can do what

| Action                       |           Employer            |                Moderator                 |                         Admin                         |
| ---------------------------- | :---------------------------: | :--------------------------------------: | :---------------------------------------------------: |
| Save as draft                |           yes (own)           |          yes (for any company)           |                          yes                          |
| Submit for review            |            **yes**            | (auto when creating on company’s behalf) |                        (auto)                         |
| Direct publish (skip review) |            **no**             |    **yes** (audited, non-Enterprise)     |                        **yes**                        |
| Approve (pending → live)     |               —               |                   yes                    |                          yes                          |
| Reject (pending → rejected)  |               —               |                   yes                    |                          yes                          |
| Edit live                    | yes (own; demotes to pending) |         yes (demotes to pending)         | yes (demotes to pending **or** trivial patch publish) |
| Force-archive                |               —               |                    no                    |                        **yes**                        |

### 7.3 Auto-expiry worker

- The existing `scheduled-tick` BullMQ scheduler runs the `job_expiry_sweep`
  handler every `WORKER_SCHEDULE_TICK_MS` (default 5 min).
- Selects up to 200 `live` jobs whose `expires_at < now()` and transitions them
  to `expired` with `archived_at = now()` in a single transaction, plus
  `outbox_events.event_type = 'job_expired'`.
- An **expiry warning** runs the same loop with a 3-day window to emit
  `job_expiring_soon` events for proactive employer emails.
- A subscription that is `cancelled` or whose `ends_at < now()` triggers the
  same path for its remaining `live` jobs.

### 7.4 Trivial patch publish (admin override)

- Admin-only.
- Allowed scope: `title` and `description` text only, with maximum **5 %**
  Levenshtein distance from the previously live version. No structural
  changes (city, category, work model, employment type, seniority).
- Recorded in `staff_audit_log` with the diff payload.
- Anything outside this envelope demotes to `pending` like normal.

---

## 8. Apply flows

Sljakam supports two apply modes per job, chosen by the employer:

### 8.1 Internal apply

- Apply form lives at `/{locale}/jobs/{slug}-{shortId}/apply`.
- Candidate must be logged in **and** email-verified before the form submits.
- Required: `resume_asset_id` (uploaded or generated).
- Optional: `cover_letter_text` (≤ 1500 plain chars).
- Application is rate-limited (50 per 24 h per candidate).
- Application is **immutable** once submitted; status changes happen on the
  employer / moderator side (`viewed → shortlisted → rejected | hired`) plus
  candidate-driven `withdrawn`.

### 8.2 External apply

- Employer pastes an `https://` URL into the job form.
- The “Apply” CTA opens the URL in a new tab (`rel="noopener nofollow"`).
- We **do not** store the candidate’s submission; we only count
  `external_apply_clicks` for the employer dashboard.
- All package gating, moderation, expiry, and analytics apply identically.

### 8.3 Mixed listings

A company can have both apply modes across different jobs simultaneously. The
mode is part of `jobs.apply_mode` and immutable after publish (changing
requires creating a new draft).

---

## 9. CV & profile

### 9.1 Candidate profile (MVP)

- `full_name`, `email`, `phone` (optional), `city_id` (optional), `headline`
  (optional, ≤ 80 chars).
- Email verification is **required before the first apply**, not before browse.

### 9.2 Resume assets

- One `is_primary = true` row per candidate in MVP. Upload accepts PDF and
  DOCX, ≤ 5 MB. Server validates MIME type + size + magic-bytes sniff.
- “Build my CV” flow: candidate fills profile + experience + education +
  skills sections, picks one of three templates, server renders PDF via
  `@react-pdf/renderer`, persists as a regular `resume_assets` row marked
  `source = 'generated'`.
- Templates available at MVP: `klasican` (classic two-column),
  `moderan` (sidebar accent), `minimalan` (single column, large headings).

### 9.3 Withdraw

- Candidate can withdraw an application from the apply history page.
- Status flips to `withdrawn`; row stays in the DB. Employer sees “Withdrawn”
  in pipeline. Cannot be reapplied to the same job for 24 h (anti-spam).

---

## 10. Billing

### 10.1 Documents

- **Proforma** (`predračun`): generated **before** payment for TEZGA / ŠLJAKA
  / ŠEF, generated **manually by admin** for GAZDA. PDF stored in S3,
  delivered by email + downloadable from the employer dashboard.
- **Invoice** (`račun`): issued **after** payment is marked received and the
  oglas is publishable / GAZDA is admin-activated.

### 10.2 Numbering

- Per-(kind, year) monotonic sequences with a slash separator:
  - Proforma: `PR-YYYY/000001`, `PR-YYYY/000002`, …
  - Invoice: `RA-YYYY/000001`, `RA-YYYY/000002`, …
  - Credit note: `CN-YYYY/000001`, `CN-YYYY/000002`, …
- Allocation uses the `billing_sequences` counter table (see schema delta B):
  ```sql
  INSERT INTO billing_sequences (kind, year, last_value)
  VALUES ($kind, $year, 1)
  ON CONFLICT (kind, year) DO UPDATE
    SET last_value = billing_sequences.last_value + 1, updated_at = now()
  RETURNING last_value;
  ```
  The `ON CONFLICT DO UPDATE` takes a row-level lock for the duration of the
  transaction, giving a gap-free monotonic sequence without `ALTER TYPE`-style
  DDL when the year rolls over (a new row is added on first issuance).
- Numbers are **never** reused, even after a void.
- Voids / corrections are issued as `credit_note` (`CN-YYYY/…`) referencing the
  original; no row is ever deleted.
- Helper symbols live in `libs/contracts/src/lib/billing.ts`
  (`formatDocumentNumber`, `parseDocumentNumber`, `documentNumberPrefix`).

### 10.3 Currency

- Domestic (`country_code = 'RS'`): **RSD** is the binding currency on the
  invoice. CMS prices are in EUR; conversion uses the NBS middle rate of the
  invoice issue date. The proforma shows EUR (informative) + RSD (binding).
- Foreign: **EUR** (default) or **USD** depending on `invoice_currency`. No
  RSD line on foreign invoices.

### 10.4 VAT (deferred for MVP)

- The application stores `vat_treatment` per company and per subscription, but
  the MVP issues invoices **without VAT** for all flows.
- Rationale: SEF (Serbian e-faktura) integration is required to charge VAT
  legitimately to RS B2B clients, and it is a P2 milestone.
- Switching VAT on later is a flag flip + invoice template variation; no
  schema change required.

### 10.5 Refund / cancellation

- **Rejected oglas:** full refund. If proforma is not yet paid, void the
  proforma. If paid, issue a credit note and a manual bank refund.
- **Employer-initiated cancel mid-period:** **no pro-rata refund** in MVP.
  The subscription continues until `ends_at` or expires when its only job
  expires, whichever comes first.
- **Employer-initiated cancel before publish:** if the proforma is unpaid,
  the employer simply abandons it (auto-expires after 14 days). If paid,
  treat like a rejected oglas.
- The refund policy is content-managed in Sanity and surfaced on the
  checkout page **and** the proforma PDF footer.

### 10.6 Test mode

- `BILLING_TEST_MODE=1` env flag.
- Generated PDFs prefix the document number with `TEST-` and add a watermark.
- No emails are sent to real addresses; they are routed to the configured
  staging inbox.

### 10.7 GDPR data retention

| Data                                   | Retention                                            | After retention                    |
| -------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| `applications` (incl. cover letter)    | 24 months from submission                            | PII anonymised, numeric stats kept |
| `resume_assets` (uploaded + generated) | tied to application or 24 months whichever is longer | hard delete from S3                |
| `users` (closed candidate account)     | 30 days grace                                        | hard delete PII; audit ID retained |
| `companies` & invoicing data           | 10 years (statutory)                                 | retained as-is                     |
| `staff_audit_log`                      | indefinite                                           | retained as-is                     |
| Candidate request: erasure             | actioned within 30 days                              | hard delete + anonymise per above  |

A “Granular cookie consent” banner is required from launch (analytics off,
ads off both must be honestly respected).

---

## 11. Sales & ownership lifecycle

### 11.1 Sales states

```
unassigned ─pickup(any moderator)──► pipeline
pipeline   ─close_won──────────────► closed_won
pipeline   ─close_lost─────────────► closed_lost
closed_lost─pickup(any moderator)──► pipeline
closed_won ─admin_reassign─────────► (new owner; status preserved; audited)
```

Transition rules:

- `pickup` from `unassigned` or `closed_lost` is allowed for any moderator.
- `close_won` and `close_lost` are issued by the assigned moderator.
- A moderator cannot pickup a `pipeline` company that they do not own.
- All transitions write `company_assignments_history`.

### 11.2 Moderator dashboard

- “My companies” view: filter by `sales_status`, search by name / PIB / VAT ID.
- “Lead pool” view: only `unassigned` and `closed_lost`.
- Action buttons: pickup, close won, close lost, “add company” (manual lead).
- Sees their own audit trail.

### 11.3 Admin dashboard

- “All companies, all moderators”, with reassignment UI guarded by reason field.
- Sees full `staff_audit_log`.
- Activates Enterprise (GAZDA) subscriptions and force-archives jobs.

---

## 12. Promo codes & growth

### 12.1 Generic promo codes

See §5.10 for the schema. Admin-only CRUD UI under
`/{locale}/admin/promo-codes`.

### 12.2 “Nedelja besplatnih oglasa”

Standardised growth campaign:

- Code is a `full_free` discount, scoped to one or more `applicable_categories`
  (e.g. `ugostiteljstvo`, `maloprodaja`, `logistika`).
- Default duration: 7 days, default `max_redemptions` configurable per campaign.
- Marketing copy (banner on homepage, hero on category page) lives in CMS as a
  promotional `editorial_page` document toggled by `valid_from`/`valid_to`.
- KPI tracking automatically tags new subscriptions with the campaign code in
  PostHog (P2 wiring; MVP records `redeemed_with_code` on the subscription).

### 12.3 Operational rhythm

One campaign per month, each focused on one vertical, sequenced in advance:
month 1 hospitality → month 2 retail → month 3 logistics, etc. Rotation is
maintained by the marketing lead in a Sanity `campaign_calendar` document so
sales and engineering both see the queue.

---

## 13. Localization & content

### 13.1 Locales and script

- Locales: `sr` (Latin) and `en`. Cyrillic switcher is **out of MVP**.
- Locale-prefixed routing: `/sr/...`, `/en/...`. Root `/` redirects to the
  best match using `Accept-Language`, falling back to `sr`.
- `hreflang` tags are required on every public page.
- Per-locale sitemap and robots.

### 13.2 Job content language

- The employer chooses `primary_language` (`sr | en`) when creating the ad.
- The ad is rendered as-authored on every locale, with a small badge
  (`SR-only` / `EN-only`) so the candidate is not surprised.
- **No machine translation.** No automatic translation pipeline anywhere.

### 13.3 CMS content language

- All Sanity documents that surface to users (packages, marketing pages,
  employer branding, navigation, legal copy, refund policy, etc.) **must
  carry both `sr` and `en` fields** with required validation in Studio.
- Editorial / blog posts may be locale-specific (e.g. only `sr`); when only
  one locale is provided, the alternate locale falls back gracefully (no
  hard error, but a small `Available in: SR` notice).

### 13.4 UI strings

- `apps/web/src/messages/{sr,en}.json` is the only place for hard-coded UI
  strings. Both files must always be in sync (linter / unit test enforces
  matching keys).
- A missing key in either file is a CI failure.

---

## 14. Operating principles (non-negotiable)

These gate **every** feature PR.

### 14.1 Performance budgets

| Surface                            | Metric             |              Budget |
| ---------------------------------- | ------------------ | ------------------: |
| Public web (mobile mid-tier 4G)    | LCP                |             < 2.0 s |
| Public web                         | INP                |            < 200 ms |
| Public web                         | CLS                |              < 0.05 |
| Public web                         | TTFB (EU-CENTRAL)  |            < 400 ms |
| Public route initial JS            | bundle size (gzip) |            < 120 KB |
| Employer dashboard initial JS      | bundle size (gzip) |            < 350 KB |
| Above-fold image                   | weight             |       < 100 KB AVIF |
| Initial fonts                      | total              | < 50 KB (subsetted) |
| Lighthouse Performance (mobile)    | score              |                ≥ 90 |
| Lighthouse Accessibility           | score              |                ≥ 95 |
| API read                           | p95                |            < 200 ms |
| API write                          | p95                |            < 400 ms |
| FTS search                         | p95                |            < 250 ms |
| Outbox dispatch (commit → enqueue) | p95                |               < 5 s |

### 14.2 Performance rules of thumb

- Public routes default to **React Server Components**.
- ISR + on-demand revalidate for job detail, company, editorial pages.
- TipTap and the employer dashboard are **dynamic-imported**; the public
  bundle never pays for them.
- Sanity client is **server-side only**.
- TanStack Query is reserved for interactive surfaces; not for public lists.
- No N+1 queries; every list endpoint uses a single query plan.
- List endpoints return `description_excerpt` (≤ 200 chars), never the full text.
- Public search has IP-based rate limiting (default 60 / min / IP).
- Auto-save drafts use a 5 s debounce + diff write.
- Slow-query log threshold: 200 ms.

### 14.3 Simplicity rules (mechanic + bookkeeper)

- ≤ 3 steps to apply, ≤ 3 steps to publish a TEZGA ad.
- ≤ 7 visible fields per screen; chunk progressive disclosure beyond that.
- ≥ 44×44 px tap targets, ≥ 16 px input font.
- WCAG 2.1 AA contrast ratios.
- Icons **always paired with text labels**.
- Plain-language errors that say what to do next.
- Auto-save forms; no work lost on a navigation accident.
- Mobile-first: design for 360 px viewport, then scale up.
- No modals on critical flows (apply, post job).
- No hover-only states.

### 14.4 Accessibility floor (WCAG 2.1 AA)

- Full keyboard navigation on apply and post-job flows.
- ARIA on every custom widget (TipTap toolbar, filter chips, comboboxes).
- Screen reader smoke tests on critical flows (VoiceOver iOS + NVDA Win).
- No color-only signals — every status pairs colour + icon + text.
- Skip-to-content link on every public page.

### 14.5 PR gate (mandatory checklist on UI changes)

Reviewer must answer **yes** to:

- [ ] Mechanic persona can complete the flow unaided?
- [ ] Bookkeeper persona can find power features without overwhelming the mechanic?
- [ ] All actions have visible text labels (not icon-only)?
- [ ] All error messages tell the user what to do next?
- [ ] All primary CTAs are above the fold at 360 px viewport?

### 14.6 CI gates

- **Lighthouse CI** runs on every PR for representative public routes.
  - First 30 days post-launch: warning only.
  - After: hard block, admin override (with documented reason).
- **Bundle size budget** enforced via `size-limit` (or Vercel deployment summary
  parser). Hard fail above the public-bundle budget.
- **Lint, format, typecheck, test** pass on every PR (Nx affected).
- **i18n key parity test** between `sr.json` and `en.json` is part of `test`.

---

## 15. State machines

### 15.1 Sales

```
unassigned ──pickup──▶ pipeline
pipeline   ──close_won──▶ closed_won  (ownership lock; admin-only reassign)
pipeline   ──close_lost──▶ closed_lost
closed_lost ──pickup──▶ pipeline
closed_won ──admin_reassign──▶ closed_won  (new owner; audited)
```

### 15.2 Subscription

```
pending_payment ──moderator_marks_paid──▶ active            (TEZGA / ŠLJAKA / ŠEF)
pending_payment ──admin_unlocks_enterprise──▶ active         (GAZDA only)
active          ──now() ≥ ends_at──▶ expired                 (auto, scheduled-tick)
active          ──admin_cancel──▶ cancelled
```

### 15.3 Job

```
draft     ──submit──▶ pending          (employer)
draft     ──direct_publish──▶ live     (moderator / admin; audited)
pending   ──approve──▶ live
pending   ──reject──▶ rejected
live      ──now() ≥ expires_at──▶ expired
live      ──force_archive──▶ archived  (admin only)
live      ──edit (non-trivial)──▶ pending
live      ──edit (trivial admin patch)──▶ live  (audited)
expired   ──new draft──▶ draft         (existing row stays expired)
rejected  ──new draft──▶ draft
```

### 15.4 Application

```
submitted ──viewed──▶ viewed
viewed    ──shortlisted──▶ shortlisted
shortlisted ──hired──▶ hired
shortlisted ──rejected──▶ rejected
viewed    ──rejected──▶ rejected
submitted | viewed | shortlisted ──candidate_withdraw──▶ withdrawn
```

---

## 16. KPIs & analytics

### 16.1 Primary KPIs (weekly)

- Active live jobs, by package.
- Applications per published job (median + p95).
- Active companies (any subscription `active`).
- Free → paid conversion within first 14 days of self-signup.
- Company retention (next-month renewal %).

### 16.2 Operational KPIs (daily)

- Time-to-publish (submit → live), median + p95.
- Moderation backlog & SLA breach count.
- Outbox backlog depth.
- Search latency p95.
- Subscription revenue gross (no VAT in MVP).

### 16.3 Employer dashboard metrics (per job)

- Applications count (internal mode).
- External apply clicks (external mode).
- Public views.
- Days remaining until `expires_at`.

### 16.4 Internal admin dashboard

- All KPIs above, plus:
- Companies by sales status, by assigned moderator.
- Promo redemptions and revenue lift per campaign.
- Top-performing categories / cities by application volume.

---

## 17. Out of scope (P2 / P3)

| Item                                          |     Phase      |
| --------------------------------------------- | :------------: |
| SEF e-faktura integration                     |       P2       |
| Charging VAT on invoices                      | P2 (after SEF) |
| Automated FB / IG publishing (Meta Graph API) |       P2       |
| VIES EU VAT validation                        |       P2       |
| Social authentication                         |       P2       |
| Cyrillic script switcher                      |       P2       |
| Multi-CV per candidate                        |       P2       |
| Multi-company per single user                 |       P2       |
| Multi-user per company (team workspaces)      |       P2       |
| Saved jobs, saved searches, alerts            |    P1 / P2     |
| Meilisearch upgrade                           |       P2       |
| ATS-lite pipeline (tags, notes, scheduling)   |       P2       |
| AI summaries / matching / parsing             |       P3       |
| Native mobile apps                            |       P3       |
| Salary intelligence / benchmarks              |       P3       |
| Calendar / ATS / HRIS integrations            |       P3       |

---

## 18. Decisions log

| Date       | Decision                                                                                                                                            | Rationale                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------ |
| 2026-05-06 | Public brand `Sljakam.com`; repo codename `hireforge` retained                                                                                      | Avoid expensive rename; codename is internal                   |
| 2026-05-06 | **Brand split rule**: `Šljakam` (with diacritic) on every user-facing surface; ASCII `sljakam` for domain, URLs, slugs, identifiers, env vars, code | Brand recognition + SEO discoverability + technical interop    |
| 2026-05-06 | **Domain owned**: `sljakam.com`                                                                                                                     | Production launch target locked                                |
| 2026-05-06 | **Glassdoor as design reference** for public candidate-facing UX (Infostud remains the competitor)                                                  | Modern, less dense candidate experience adapted to mass market |
| 2026-05-06 | Package codes `tezga / sljaka / sef / gazda`                                                                                                        | Stable DB handle; CMS owns display copy                        |
| 2026-05-06 | CMS authoring + DB mirror + per-subscription snapshot                                                                                               | Editor flexibility without touching live subs                  |
| 2026-05-06 | Foreign company support (`is_foreign`, EU VAT / non-EU tax IDs, IBAN, SWIFT)                                                                        | First-class international billing                              |
| 2026-05-06 | Sales ownership lock with admin-only reassignment                                                                                                   | Sales contractual expectation; auditable                       |
| 2026-05-06 | Auto-expiry via scheduled-tick worker, snapshot `duration_days`                                                                                     | Reuses existing infra                                          |
| 2026-05-06 | TipTap + ProseMirror JSON canonical, sanitised HTML render                                                                                          | Industry standard; capability-gated                            |
| 2026-05-06 | Hyperlinks available to all packages, with per-package count + anti-spam rules                                                                      | Honour business request without opening abuse vector           |
| 2026-05-06 | Char limits TEZGA 400, ŠLJAKA 4000, ŠEF 8000, GAZDA 20000                                                                                           | Keeps FTS healthy and mobile UX clean                          |
| 2026-05-06 | Direct publish for moderator + admin only; employer always reviewed                                                                                 | Trust + speed for staff                                        |
| 2026-05-06 | B2C registration mandatory but minimal; browse open                                                                                                 | SEO + audience growth                                          |
| 2026-05-06 | Latin only in MVP, no Cyrillic switcher                                                                                                             | Reduce MVP surface                                             |
| 2026-05-06 | One CV per candidate in MVP; schema scalable to many                                                                                                | P2 multi-CV without migration                                  |
| 2026-05-06 | One user ↔ one company in MVP; schema scalable to many                                                                                             | P2 multi-company without migration                             |
| 2026-05-06 | Apply mode per job (`internal                                                                                                                       | external`)                                                     | Mirrors Infostud reality |
| 2026-05-06 | RSD invoicing for RS clients, EUR for foreign                                                                                                       | Local law + international convenience                          |
| 2026-05-06 | VAT charging deferred to P2 (after SEF integration)                                                                                                 | SEF is a hard prerequisite                                     |
| 2026-05-06 | No pro-rata refunds in MVP                                                                                                                          | Simpler ops; revisit with data                                 |
| 2026-05-06 | Lighthouse CI: warn 30 days, then hard block                                                                                                        | Performance is brand-critical                                  |
| 2026-05-06 | Mobile baseline Samsung A24 / Redmi 11, 4G                                                                                                          | Realistic for mass-market personas                             |

---

## 19. Glossary

- **AE** — Account Executive (the sales role represented by `moderator`).
- **Closed won / closed lost** — sales states; closed won locks ownership.
- **Direct publish** — a moderator or admin shortcut that publishes a job
  without a separate `pending` review step. Always audited.
- **Entitlements** — the JSON blob that says what a package can do (cities,
  characters, editor capabilities, etc.). Snapshotted at purchase.
- **Internal apply / External apply** — whether the candidate submits to our
  database or is forwarded to the employer’s external form.
- **Outbox** — transactional write pattern; events queued in the same DB
  transaction as their causing state change, dispatched by a worker.
- **PIB** — Serbian tax ID (8 digits, domestic companies).
- **MB** — Serbian “matični broj” (8 digits, domestic companies).
- **Predračun** — proforma invoice (issued before payment).
- **Račun** — final invoice (issued after payment).
- **Reverse charge** — VAT mechanism for B2B EU services where the recipient
  accounts for VAT, so the issuer invoices without VAT.
- **SEF** — Sistem Elektronskih Faktura, Serbia’s state e-invoicing system
  (mandatory for B2B inter-RS invoicing). P2.
- **Snapshot** — copy of CMS-driven values frozen onto a subscription at
  purchase; later CMS changes do not affect existing subscriptions.
- **TEZGA / ŠLJAKA / ŠEF / GAZDA** — public package names (CMS-editable).
  DB codes are `tezga`, `sljaka`, `sef`, `gazda`.

---

## 20. Cross-links

- Technical SSOT (stack, infra, repo layout): [`PROJECT_SSOT.md`](./PROJECT_SSOT.md)
- Execution plan (steps, mini-steps, verification gates): [`docs/refactor/MIGRATION_PLAN.md`](./docs/refactor/MIGRATION_PLAN.md)
- Public README: [`README.md`](./README.md)

---

## 21. Changelog

| Date       | Change                                                                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-06 | Initial product SSOT for **Sljakam.com**: brand, scope, personas, packages (TEZGA / ŠLJAKA / ŠEF / GAZDA), foreign company billing, sales ownership, subscription model, internal vs external apply, CV templates, RSD/EUR invoicing, refund/cancellation, GDPR retention, performance + simplicity gates, state machines, KPIs. |
| 2026-05-06 | Added **brand split rule** (Šljakam display vs sljakam ASCII), confirmed `sljakam.com` domain is owned, added **Glassdoor as design reference** with explicit adopt / do-not-adopt patterns for public discovery UX.                                                                                                             |
