# Design / UX review 02 — Šljakam (sljakam.com)

Date: 2026-10-29 · Reviewer: Claude Code · Scope: `apps/web`, every route, every role

Review 01 (2026-10-28) is fully shipped (design phases 1–3, PROGRESS.md). This
review starts from what's live now: guest access option B, the sign-up bar,
legal pages, and a **production database that is empty** (launch state).

**How it was checked**

- Live sljakam.com public pages at 375 and 1440 (empty DB, real CMS).
- A local copy with the dev seed plus 13 jobs, a candidate with two
  applications and an expired ad, swept by Playwright as guest, candidate,
  employer, moderator and admin, at 375 and 1440, light and dark. That's 178
  page views with a full screenshot each, plus horizontal overflow, touch
  targets, headings, axe (WCAG 2.1 AA) and console errors.
- Code for anything a screenshot suggested.

Out of scope (other sessions own them): legal texts and pages, invoices and
company details, and the known-bugs list in PROGRESS.md.

**Status:** K-1, E-2, E-5 (feature lists + placeholder), J-1, S-5 (postal
code) and the expiry date from J-2 are fixed on `feat/dashboards-packages-job-page`.
The rest is open; other sessions work on parts of it.

---

## Summary

- **Healthy base.** No horizontal scroll at 375 on any of the 178 views and no
  console errors. Dark mode is consistent. axe finds only 7 issues in total
  (below). Review 01's fixes hold.
- **Biggest gap: the launch state.** With no jobs, the site tells people
  their _filters_ are wrong. It advertises a "free listings week" that doesn't
  exist, and gives employers, the side that has to move first, no clear path
  to post. Fix this before anything else (§1).
- **Search UX is the core loop and has two real problems.** The list scrolls
  inside a 70vh box, so you scroll a box inside the page. On phones the
  keyword search sits behind "Filteri" (§2).
- **Dashboards are brochures.** Candidate and employer overviews show static
  marketing text. Neither shows a single number about the user's own
  applications or jobs (§4, §5).
- **Employers can't see prices before signing up**, and the packages page
  reads upsell lines as if they were features (§5).
- **Consistency debt:** three job card designs, nested cards in the
  workspaces, a 6-column footer that runs ~1000px tall on phones, and one
  file (`home-spotlight-rail.tsx`) holding 32 of the 82 off-token values (§6).

---

## Findings

Format: **problem** → why it matters → fix. Effort S (< ½ day), M (½–2 days),
L (more). Most-important first within each section.

### 1. Launch state (empty database) — do first

**L-1 Fake promo banner on the home page.** "Nedelja besplatnih oglasa —
pogledajte aktuelne ponude." comes from the seeded `campaignCalendar` stub
(valid until 2030). No such campaign exists, and it uses _vi_ where the site
uses _ti_. It promises something the site doesn't deliver. → Remove it in
Sanity (or delete the slot), and only show it when a real campaign with a
real date range exists. **S**, CMS + `scripts/cms/seed-sanity.mjs`.

**L-2 Empty states blame the filters.**

- `/sr/jobs` with zero jobs shows "Obriši filtere" with no filter set.
- City and category landings show "Trenutno nema aktivnih oglasa" _and_
  "Nema oglasa za ove filtere — Probaj sa manje filtera".
- `/sr/employers` says "nothing" three times (two chips and a box).

Every first visitor sees one of these.
→ Three distinct states:

| State                         | What it shows                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| No jobs at all                | "Prvi oglasi stižu uskoro". For candidates: make an account, get notified. For employers: "Objavi prvi oglas" |
| No jobs in this city/category | "Još nema oglasa u Beogradu". Links to all jobs and to nearby categories                                      |
| Filters exclude everything    | The current message                                                                                           |

**M**, `jobs-list-screen.tsx`, `employers-directory-view.tsx`, messages.

**L-3 Home page in launch state.**

- There's no employer call to action above "Kako funkcioniše".
- Category tiles show only IT and Marketing. The other CMS spotlights point at
  categories the database doesn't have yet, and #28 hides those.
- Each tile is a large gradient with a single letter ("I", "S") as a
  placeholder.

→ With few jobs, lead with an employer band ("Zapošljavaš? Objavi oglas za X
€"). Replace the spotlight rails with a plain grid of category and city links
(§6, G-4). **M**.

**L-4 No public pricing.** "Poslodavci" in the nav opens a company directory.
Prices exist only behind sign-up _and_ email verification. Employers decide on
price, so the funnel is missing its main page. → A public "Za poslodavce" page:
packages side by side, what moderation means, "Registruj kompaniju". Keep the
directory, perhaps renamed "Kompanije". **M**, needs Q1.

### 2. Job search (`/jobs`, landings)

**S-1 The list scrolls inside a box.** `jobs-infinite-list.tsx:258` caps the
list at `max-h-[min(70vh,720px)] overflow-y-auto`. On desktop only about 3
cards show, with empty space below them. On phones you get a scroll inside a
scroll, a known thumb trap. → Use the window as the scroll container
(`useWindowVirtualizer`) and keep the preview pane sticky (it already is).
**M**.

**S-2 No keyword field on phones.** At 375 the page goes title → "Filteri" →
cards. Typing a job title takes a tap into the filters first. → Show the
keyword field (and city) above "Filteri"; fold only the chips. **S**.

**S-3 Guests see 12 locked chips before the search form.** Lock icons on
every chip push the actual search below the fold and read as "you can't do
anything". → Search form first. For guests, replace the chips with one line:
"Prijavi se za filtere po modelu rada, tipu i datumu". **S–M**.

**S-4 Two filter systems.** Chips apply immediately, while the form needs
"Primeni". → One model: everything applies on change (debounced keyword), and
"Primeni" goes away. **M**.

**S-5 Card meta noise.**

- "Beograd (11000)" shows a postal code on every card, the job page and the
  company page.
- The absolute "Objavljeno 28. 10. 2026." should be relative ("pre 2 dana"),
  which was review 01 VD-5 and is still open.
- Salary still has no slot (review 01 Q4).

**S**.

**S-6 "Sortirano po najnovijem"** but featured ads come first. → "Istaknuti,
pa najnoviji", or a sort control. **S**.

### 3. Job page, apply, company page

**J-1 "Konkuriši za ovaj posao" appears twice within one screen.** On phones
the sticky bar makes it three. → Keep the top button and the sticky bar.
Turn the "Konkurisanje" section into information ("Konkurišeš uz CV sa
profila") without a second button. **S**.

**J-2 Desktop wastes the page.** It's one 735px column. Facts are spread
through the text, and the **expiry date isn't shown anywhere**. → A sticky
side card on desktop with location, model, type, seniority, published,
expires (and salary later), the apply button and save. **M**.

**J-3 Small copy and visual issues.**

- "Nazad na poslove" looks like plain text; it needs an arrow or underline.
- "Podržano od strane poslodavca" under "Istaknuto" is an odd literal
  ("Sponsored by the employer"); just "Istaknut oglas" will do.
- The full gold border around the whole card is loud. The badge is enough.

**S**.

**J-4 No save or share on the job page.** Save exists only on list cards.
**S**.

**K-3 Apply page** (`/jobs/[ref]/apply`).

- It has **no h1**; the job title is an h2.
- axe flags `button-name`: an icon-only button with no label.
- It shows no job context (company, city, summary).
- It uses three cards for a two-field form.

→ One card with an h1 "Konkuriši: {posao}", a job summary line, the message,
the CV choice and the send button. **S**.

**C-1 Company page.**

- No logo, website, city or size.
- The job list uses a third card style, with no save or "Istaknuto".
- 13 jobs show as a long unfiltered list.

→ Company header with logo and facts; reuse the list card; add a filter or
search when there are more than 8 jobs. **M**, logo upload is a product
question (Q3).

### 4. Candidate area

**K-1 The overview is static text.**

- "Zdravo!" plus three cards describing features ("Prati svaku prijavu…").
- Nothing about the user: no application count or statuses, no saved jobs,
  no CV on file, no profile completeness, no new matching jobs.

→ Overview = application statuses, "Profil 60 % — dodaj ime", saved jobs and
the latest jobs in their city or category. **M**.

**K-2 The header shows the email as the name** (`apply-…@example.com` in big
type and in the avatar menu). The profile has an "Ime za prikaz" field nobody
is asked to fill. → Ask for the name at sign-up (one optional field), and fall
back to the email's local part. **S**.

**K-4 Application status is only "Poslato".** There's no timeline or "viewed".
This depends on the employer status workflow (Phase E 4). The candidate side
should show it as soon as it exists.

### 5. Employer area

**E-1 Sign-up says "Vraćen je sačuvan nacrt" on a first visit (bug).**
`employer-register-form.tsx` saves the empty draft on its first render. The
auth pages then call `router.refresh()`, the form mounts again, finds that
"draft" and announces it. It's live on sljakam.com, and it's the first thing
a new employer reads. → Only save a draft that has content, and only announce
one with content. Add a test. **S**.

**E-2 The overview is static text** (review 01 APP-2, still open). → Active
jobs, new applicants since the last visit, slots left in the package, ads
expiring in 7 days, and one primary action. **M**.

**E-3 The jobs table hides what matters.**

- No applicant count and no expiry date.
- The title isn't a link.
- Every action sits behind a 32px "…".
- "Poslednja izmena" with the exact time is the least useful column.

→ Columns: title (link) · status · applicants (link) · expires · actions.
**S–M**.

**E-4 The applicants page is the product's value moment, and it's thin.**

- Email only, with no name.
- No cover letter (known issue, other session).
- No status actions (Phase E 4).
- The job title is small grey text under a generic "Kandidati" heading.

→ The h1 is the job title. Each row shows name, email, CV link and the
cover-letter excerpt, with status actions once Phase E lands. **M**, mostly
with Phase E.

**E-5 The packages page reads wrong.**

- Each package lists "Nadogradi za…" lines (things it _doesn't_ have) in the
  same style as its features.
- "Uporedi sve pakete ispod na ovoj stranici" points at no comparison.
- Gazda is a sentence, not a card.
- The promo field placeholder is the developer string `OPTIONAL-PROMO`.
- An empty "Tvoje pretplate" block sits above the choices.
- axe flags `button-name` ×2.

→ A comparison table (rows = features, columns = packages, ✓ / —), with the
period select and the "Pretplati se" button per column. Subscriptions go
below, or only when they exist. Placeholder "npr. JESEN25". **M**.

**E-6 Workspace header eats the phone screen.** At 375 the header card, the
email-verification banner and the pill nav take ~600px before any content.
→ On phones, a compact one-line header (company · menu) with the banner
collapsed to one line plus a button. **S–M**, `WorkspaceShell`.

**E-7 Headings.** The job edit page and the company page each have two h1s
(the workspace header and the page). The edit page also has an unnamed
progress bar (axe `aria-progressbar-name`). → The workspace header becomes a
non-heading label, so each page owns its h1. **S**.

### 6. Global, design system, staff

**G-1 Footer.**

- 6 columns, with "Prijava" in two of them.
- The copyright wraps awkwardly in a narrow column.
- At 375 it's ~1000px of stacked sections.
- "Prijava za osoblje" is still public (review 01 NAV-5 said to remove it).

→ At 375 use a 2-column grid of the link groups, or collapse them. Drop the
duplicated "Prijava". Move the staff link to `/moderator/login` only. **S**.

**G-2 Nested cards in the workspaces.** Every workspace page is a header card,
then a section card with a title and one sentence, then a content card. That's
three borders and about 250px of chrome before content. → One page heading
(text, not a card) and the content card. **M**, `WorkspaceShell` and pages.

**G-3 Three job card designs:** the home grid card, the list card, and the
company page card (plus tables). They differ in fields, badges and save.
→ One `JobCard` with `variant="list" | "grid" | "compact"`. **M**.

**G-4 Spotlight rails.** `home-spotlight-rail.tsx` holds 32 of the 82
off-token values. The accordion with vertical text is hard to read, and the
single-letter tiles look unfinished. → A plain grid of category and city links
with job counts (icons optional). That also clears 40 % of `check:design`.
**M**.

**G-5 Touch targets below 44px on phones.**

- Save on cards: 40px.
- Company-page job links: 20px tall.
- Employer "Akcije": 32px.
- The logo link: 36px.

→ Raise them to 44px; then add the 44px check to e2e (review 01 Later 6).
**S**.

**G-6 axe (WCAG 2.1 AA) leftovers.**

| Page              | Issue                     |
| ----------------- | ------------------------- |
| `/about`          | 1 `color-contrast`        |
| Candidate profile | 1 `label`                 |
| Apply             | 1 `button-name`           |
| Packages          | 2 `button-name`           |
| Job edit          | 1 `aria-progressbar-name` |

`e2e/a11y.spec.ts` covers only public pages; these are all outside it except
`/about`. → Fix them, and add the workspace pages to the a11y spec. **S**.

**M-1 Staff areas.**

- The moderator header has its own "Odjavi se"; other roles use the avatar menu.
- The empty queue says "Nema oglasa" twice.
- The moderator job page has three h1s.
- `/moderator/jobs/new` silently redirects to companies.

→ Align with `WorkspaceShell`, one empty message, one h1, and a short note on
the redirect. **S**.

---

## Roadmap

### Now (before the first employers arrive, ~1–2 days)

1. E-1 sign-up draft bug.
2. L-1 remove the fake promo banner.
3. L-2 three empty states.
4. S-2 keyword field on phones.
5. J-1 one apply button.
6. J-3 back link and featured copy.
7. S-5 drop the postal code; relative dates.
8. K-3 apply page h1, label and job context.
9. G-6 axe leftovers.
10. G-1 footer on phones and the staff link.
11. E-5 placeholder text.

### Next (1–2 weeks)

1. L-4 public "Za poslodavce" page with pricing, and E-5 comparison table
   (after Q1).
2. S-1 window scrolling for the list.
3. S-3/S-4 one filter model, with search first for guests.
4. E-2 and K-1 real dashboards.
5. E-3 jobs table columns.
6. J-2 desktop job page with facts card and expiry.
7. E-6/G-2 compact workspace chrome without nested cards.
8. L-3/G-4 home page for launch: employer band and plain category/city grid.

### Later

1. G-3 one `JobCard`.
2. C-1 company header (logo after Q3).
3. E-4/K-4 applicants page and status timeline (with Phase E 4).
4. J-4 save and share on the job page.
5. G-5 44px everywhere plus the e2e check; make `check:design` blocking.
6. M-1 staff polish.

---

## Open questions for Stefan

1. **Public prices:** may package prices be shown to anyone (a "Za
   poslodavce" page), or only after sign-up? Most job boards show them; it's
   the main employer conversion page.
2. **"Poslodavci" in the nav:** should it point at the new employer page
   (pricing, how it works) with the directory renamed "Kompanije", or keep
   the directory there?
3. **Company logos:** should employers upload a logo (storage, moderation),
   or is a generated monogram enough for now?
4. **Launch campaign:** is there a real "Nedelja besplatnih oglasa" coming
   (dates, promo code)? If yes, the banner comes back with it.
5. **Candidate name at sign-up:** may it be required, or only optional?
