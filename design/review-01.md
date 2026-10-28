# Design / UX review 01 — Šljakam (sljakam.com)

Date: 2026-10-28 · Reviewer: Claude Code (read-only audit) · Scope: `apps/web`

Sources: code under `apps/web/src`, `global.css`, `scripts/design/check-*.mjs`
output, committed screenshots `e2e/visual/__screenshots__/linux/{phone-375,desktop-1440}/*.png`,
`PRODUCT_SSOT_SLJAKAM.md` §1 and §3, `PROGRESS.md`, and the live site
(`/sr` home and `/sr/jobs?q=konobar`, fetched read-only). Guideline IDs in
`[brackets]` come from the ui-ux-pro-max checklist (`references/quick-reference.md`)
or its shadcn stack data. The header logged-out-after-login bug is out of scope.

Caveat on screenshots: the visual baselines render with Linux CI fonts and no CMS
content. Some glyph and weight oddities in them (bold-looking `š`/`đ`/`ž`, headings
that should be bold rendering regular) are partly CI font fallback. They still
point at a real issue: the site ships **no web font** (see DS-4).

---

## Summary

- **Verdict:** a solid technical base (oklch tokens, shadcn primitives, design
  and contrast checkers, axe in e2e, visual baselines) under a UI that hasn't had a
  design pass yet. The structure follows the Glassdoor reference (two-column
  list + preview, chips, landing pages). The problems are mostly consistency,
  copy and a few IA bugs, not architecture. None of it needs a rewrite.
- **Fix 1 — Guests can't find the jobs.** `site-header.tsx` hides `/jobs` and
  `/employers` from guests (`shouldHideForGuests`), even though jobs have been
  public since the SEO phase. The home page has no "all jobs" link when there are
  no featured jobs. Live, the header shows only "Početna · O platformi".
- **Fix 2 — Developer copy is live on prod.** The jobs empty state on sljakam.com
  says "Lokalno možete pokrenuti seed SQL…". Error states print
  `NEXT_PUBLIC_API_URL`/localhost instructions, the employer job form mentions
  `EXTERNAL_APPLY_HOST_ALLOWLIST`, and the packages page mentions `drizzle/0012_*`.
- **Fix 3 — English enums on the Serbian site.** "Onsite / Remote / Hybrid / Full
  Time / Part Time / Contract / Internship / Temporary / Mid" come from
  `humanizeEnum()`. Serbian labels already exist in `Employer.jobForm.{wm,et,sen}`.
- **Fix 4 — "Prijava" means both sign-in and job application.** On the job
  page, "Prijava" (section) → "Prijavi se na ovaj posao" → "Prijavi se da
  konkurišeš", next to the header's "Prijava" (sign in). The tone also switches
  between ti and vi, and the hero uses English title case.
- **Fix 5 — Accessibility gaps axe doesn't catch.** The main hero search input
  has no label and `outline-none` with no replacement focus style. The mobile
  menu is a hand-rolled popover (`☰` glyph, no Escape, no focus handling, **no
  logout**). Most touch targets are 28–36px. Nothing handles `prefers-reduced-motion`.
- **Design system debt is one pattern, not 245 problems.** There are no
  success/warning/info tokens, so components reach for `amber/emerald/red-*`
  (71 hits). Older screens use `gray-*`/`teal-*` instead of tokens (99 hits). There
  is no type scale (11 one-off `clamp()` headings). Half of the off-token values
  sit in 3 public files.

---

## What works (keep these)

- **Token foundation.** `global.css` uses oklch semantic tokens exposed through
  `@theme inline`. `--primary` was tuned to L 0.50 for AA (5.26:1 on background,
  5.36:1 for button labels). `--brand-accent` gold ties into the mark. This is the
  right three-layer starting point (primitive → semantic → Tailwind utility).
- **Guardrails exist.** `check-design.mjs`, `check-contrast.mjs`, axe in e2e
  (blocking, `e2e/a11y.spec.ts`) and 375/1440 visual baselines are more than most
  products have at this stage. Keep them warn-only until the cleanup below, then
  ratchet (see roadmap).
- **Brand mark.** `brand-mark.tsx` (S with a check-mark caron) is distinctive, works
  at 16px (`docs/design/logo-concepts.png`) and is generated from the same paths
  as the app icons (`make-icons.mjs`). Good single source.
- **Primitives.** `Button`/`Input` have proper `focus-visible` rings. `Input` is
  `text-base md:text-sm`, so iOS doesn't zoom [`readable-font-size`].
  `PasswordInput` has `aria-pressed` and localized labels. `LocaleSwitcher` keeps
  the visible "EN" inside the accessible name (WCAG 2.5.3) and preserves the query.
- **Job card pattern.** `public-job-card.tsx` uses a stretched link with a nested
  company link and save button. It has an accessible name per card
  (`cardOpenJobAria`), a skeleton (`public-job-card-skeleton.tsx`), and an
  infinite list with a status line ("Učitano 1 odgovarajućih oglasa").
- **IA bones match the SSOT.** Desktop two-column list + preview with URL state,
  filter state in the URL [`deep-linking`], breadcrumbs on landing pages
  (`landing-city.png`), an expired-ad banner, similar jobs, and a company snapshot.
- **Sign-in chooser** (`sign-in.png`) is clear: two equal cards, one primary and
  one secondary action each, and it works at 375.
- **Auth forms** (`candidate-login-form.tsx` and siblings) have visible labels,
  correct `autocomplete`, `role="alert"` errors and a POST method
  [`autofill-support`, `aria-live-errors`].
- **Employer signup autosaves its draft** [`form-autosave`]. The password is kept
  out of the draft.
- **Workspace consistency.** Candidate, employer, moderator and admin share one
  header-card + sticky pill-nav layout. `TableStatusBadge` centralizes status →
  tone mapping. This is the seed of semantic status tokens.
- **No horizontal scroll at 375** in any baseline [`horizontal-scroll`].

---

## What doesn't work

Format: **problem** → why it matters → recommendation → effort → files.

### 1. Design system & tokens

**DS-1 No status tokens, so status colours are hard-coded.**
71 of the 190 palette hits are `amber-*`, `emerald-*`, `red-*`, `sky-*` for
featured, warning, success, error and info. They don't follow the theme and won't
survive dark mode. → This breaks [`color-semantic`] and makes the light/dark
contrast checker blind to them. → Add `--success`, `--success-foreground`,
`--warning`, `--warning-foreground`, `--info`, `--info-foreground` (and a
`--featured` alias of `--brand-accent`) to `:root`/`.dark`, map them in
`@theme inline`, and add their pairs to `check-contrast.mjs`. Then rewrite
`TableStatusBadge.toneClass` to use them, plus the featured/crossborder chips and
the error/empty blocks. → **M** → `app/global.css`,
`components/table-status-badge.tsx`, `features/jobs/components/job-listing-preview.tsx`,
`jobs-list-screen.tsx`, `employer-workspace-shell.tsx`,
`employer-register-form.tsx`, `candidate-cv-build-wizard.tsx`,
`scripts/design/check-contrast.mjs`.

**DS-2 Legacy `gray-*`/`teal-*` instead of tokens (99 hits).**
76 `gray-*` and 23 `teal-*`, concentrated in `job-listing-preview.tsx` (47 —
it renders the public job page), `public-company-page.tsx` (35),
`jobs-list-screen.tsx` (16). Example: the job page article is `bg-white
border-gray-200 text-gray-900` and its links are `text-teal-700`, not
`text-primary`. → These are the most-visited public pages and they skip the
tokens. → Do a mechanical swap (`text-gray-900`→`text-foreground`,
`text-gray-500/600/700`→`text-muted-foreground`, `border-gray-200`→`border-border`,
`bg-white`→`bg-card`, `text-teal-700`→`text-primary`). Fixing these 3 files
removes ~40% of the checker's findings. → **S** → files above.

**DS-3 No type scale.** There are 11 different `text-[clamp(...)]` headings (h1s
in `page.tsx`, `sign-in/page.tsx`, `jobs-list-screen.tsx`,
`employers-directory-view.tsx`, `public-company-page.tsx`, `auth-form-gateway.tsx`…),
plus `text-[0.9375rem]`, `text-[0.8125rem]`, `text-[0.65rem]`, `text-[10px]`,
`text-[11px]`. Heading weights range from `font-normal` (job title in
`job-listing-preview.tsx`) through `font-bold` to `font-extrabold` (home/sign-in h1).
→ Page titles look different on every route: compare `jobs-list.png`
"Poslovi" with `home.png` and `sign-in.png` [`font-scale`, `weight-hierarchy`].
→ Define 5–6 roles in `@theme` (`--text-display`, `--text-h1`, `--text-h2`,
`--text-h3`, `--text-body`, `--text-caption`, each with line-height and weight),
or a small `Heading` component with `level`/`size` props. Rule: h1 600–700, body
400, labels 500. → **M** → `app/global.css`, the h1 sites listed.

**DS-4 No web font; diacritics depend on the OS.** `layout.tsx` only sets
`font-sans` (Tailwind's system stack). No `next/font` anywhere. → The brand has no
typographic voice. Rendering differs between Windows, macOS, Android and CI. The
visual baselines are font-dependent: `š`/`đ`/`ž`/`č` visibly fall back in
`home.png`, `jobs-list.png` and the footer "PRONAĐI" [`font-loading`]. → Load one
variable sans with `next/font/google`, `subsets: ['latin', 'latin-ext']`,
`display: 'swap'`, and expose it as `--font-sans`. Candidates with latin-ext:
Inter, Manrope, Plus Jakarta Sans. If Cyrillic pages are still on the table
(`PROGRESS.md` ideas), choose one that also ships `cyrillic` (Inter, Manrope),
so you never switch fonts later. Re-baseline visuals after. → **S** →
`app/[locale]/layout.tsx`, `app/global.css`.

**DS-5 Radius and shadow have no rule.** Usage: `rounded-2xl` ×96, `rounded-full`
×93, `rounded-xl` ×71, `rounded-md` ×33, `rounded-lg` ×24, `rounded-3xl` ×15, plus
`rounded-[0.85rem]`. `Card` is `rounded-xl` but feature cards use `rounded-2xl`.
`Input` is `rounded-md`, but every form overrides it to `rounded-xl` (forms) or
pill (filters, hero). `Button` uses `rounded-[var(--radius-3xl,1.125rem)]`
(≈ pill). → Inputs next to buttons have different corners; cards differ by
page [`consistency`, `elevation-consistent`]. → Pick one rule and bake it into
the primitives: controls (Button, Input, Select trigger, chips) = full pill;
cards/panels = `rounded-2xl`; menus/popovers = `rounded-xl`. Then delete the
per-call overrides (`[&_input]:rounded-xl` in `employer-register-form.tsx`, the
`h-11 rounded-xl` on every login input). Same for elevation: `shadow-sm` for
cards, `shadow-lg` for overlays, nothing else. → **M** → `components/ui/*.tsx`,
auth forms.

**DS-6 Dead tokens and half-built dark mode.** About 20 `--gradient-*` variables ×2
themes are defined. Only the primary trio is used (BrandMark, wordmark,
`hf-gradient-text`). The secondary, outline, ghost, link and destructive
gradients have no consumers. `.dark` is fully defined, but nothing ever sets the
class (no theme provider, no `prefers-color-scheme`). `PROGRESS.md` already says
"no dark theme yet". The checker's two dark failures (input outline,
`destructive-foreground` on `destructive` at 2.77:1) aren't visible to anyone
today. → Unused tokens make the system look bigger than it is and confuse whoever
edits it next. → Delete the unused gradient tokens. Decide on dark mode (open
question Q1): either remove `.dark` and the 11 `dark:` classes, or finish it.
Finishing it means fixing `destructive-foreground` (use a dark foreground, or
darken `--destructive` in dark) and adding a toggle. → **S** (delete) / **M**
(ship) → `app/global.css`.

**DS-7 Input outlines fail non-text contrast (light, the theme that ships).**
`--input` `oklch(0.922 0 0)` is 1.21:1 on background and 1.26:1 on card. Forms
then lower it further with `border-border/70`. WCAG 1.4.11 asks for 3:1 for the
boundary of a control. In `jobs-list.png` the "Reči" input is barely
distinguishable. → Mass-market users on cheap Android screens in sunlight
(SSOT §3.1). → Set `--input` around `oklch(0.70 0.01 200)` (check it reaches 3:1
in `check-contrast.mjs`) and keep `--border` light for dividers. Separating
"control border" from "divider" is the point of having two tokens. Then remove
the `/70` and `/60` opacity overrides on inputs. → **S** → `app/global.css`,
auth forms, `jobs-filter-form.tsx`.

**DS-8 The checker counts legitimate exceptions.** `integration/page.tsx` (dev-only),
`global-error.tsx` (renders outside the layout), `manifest.ts`/`layout.tsx`
`themeColor` hex (must be hex), and skeleton widths are counted next to real
problems. → **S** → add an allowlist to `scripts/design/check-design.mjs` so the
number reflects real debt. Then make it blocking per directory once a directory
is clean.

### 2. Visual design

**VD-1 Two visual languages.** The hero, sign-in and audience cards use glass
(`bg-card/70 backdrop-blur`), three blurred orbs (`hf-hero-orb` with
`bg-primary/40`, `bg-cyan-400/30`, `bg-emerald-400/25`), gradient text and glow
hovers. The list, detail, company and workspace pages are flat white cards. →
Moving from home into the product feels like a different site. The design-system
search for a job board recommends **flat, no gradients/shadows, 150–200ms colour
transitions** [`style-match`, `effects-match-style`]. → Keep the teal and the
gold mark. Drop the orbs and `backdrop-blur` on content cards (blur is for
overlays [`blur-purpose`]). Keep at most one gradient moment (the hero accent
word). Let whitespace and type do the work. → **S** → `app/[locale]/page.tsx`,
`sign-in/page.tsx`, `auth-public-gradient-shell.tsx`, `home-audience-paths.tsx`,
`global.css` utilities.

**VD-2 "Featured" has two looks, and one fails contrast.** The list card shows a
`bg-primary/10` pill at `text-[0.65rem]` (~10px). The detail page shows a full
`from-amber-500 to-amber-600` banner with **white text**: white on amber-500 is
about 2.1:1, which fails AA (`job-listing-preview.tsx`). The preview chip is
`bg-amber-100`. → Paid placement is a product you sell; it needs one recognisable
look. → Use one `Featured` badge driven by `--brand-accent` (gold) with dark text
(`--warning-foreground`-style) everywhere. Make it ≥12px and add the Sparkles icon
for non-colour meaning [`color-not-only`]. → **S** → `public-job-card.tsx`,
`public-job-teaser-card.tsx`, `job-listing-preview.tsx`.

**VD-3 The job page is a long single card with weak hierarchy** (`job-detail.png`).
The title is `font-normal`, section headings are unstyled `h2`s ("Prijava" has
no size or weight), and the company name and city appear twice (header line and
"O poslodavcu"). Similar jobs sit _inside_ the card _before_ the apply section. →
The apply CTA, the page's single job, is the last thing on the page. → Split the
page into a header block (title 600–700, company, city, chips, a primary
**Konkuriši** button at the top), a description, and a sidebar on ≥lg (company
snapshot + apply card, sticky). Move "Slični poslovi" below the card. On mobile,
add a sticky bottom apply bar (SSOT §1.5.1 "Sticky apply CTA"
[`primary-action`]). → **M** → `job-listing-preview.tsx`,
`job-detail-screen.tsx`, `similar-jobs-section.tsx`.

**VD-4 Content edges don't line up.** The header and footer are `max-w-6xl`
(x=160 at 1440). The company page content starts at x=224, the job detail at
x=352 (`max-w-3xl` centred), and the workspaces use `max-w-5xl`. → The page
jumps sideways between routes [`container-width`]. → Use one container
(`max-w-6xl`). Constrain _reading width_ inside it (`max-w-prose` on
description text) instead of shrinking the whole page. → **S** →
`public-company-page.tsx`, `job-detail-screen.tsx`, workspace shells.

**VD-5 Dates are absolute and cards carry no salary.** Cards show "Objavljeno 15. 10. 2026." SSOT §1.3 says "numbers over fuzzy phrases"; on a job board,
freshness is the number people scan for ("pre 3 dana"). Salary is a SSOT §1.5.1
"adopt" pattern, but no salary fields exist (backend, out of scope here). → Use
`format.relativeTime` for <30 days with the absolute date in a `<time title>`.
Keep a salary slot in the card design so it doesn't need a redesign later (see
Q4). → **S** → `public-job-card.tsx`, `public-job-teaser-card.tsx`.

### 3. Navigation & IA

**NAV-1 Jobs are hidden from guests in the header (top issue).**
`site-header.tsx` filters `/jobs` and `/employers` out for unauthenticated
users. That made sense under the old login wall, but `PUBLIC_JOBS` now defaults
on. The live header shows "Početna · O platformi" and the main product has no
nav link [`persistent-nav`, `navigation-consistency`]. → Gate the filter on
`!publicJobsEnabled()` (already exported from `shared`, used in
`app/[locale]/page.tsx`), or just drop it. Order: **Poslovi · Poslodavci · (O
platformi)**. "Početna" is redundant next to the logo. → **S** →
`components/site-header.tsx`.

**NAV-2 The home page has no route into the list when there are no featured
jobs.** Only `HomeFeaturedJobsStrip` has a "Pogledaj sve poslove" link, and it
returns `null` with 0 featured jobs. `HomePopularJobsStrip` has no link, and its
title "Još pozicija" ("more positions") makes no sense when nothing is above it
(`home.png`, live). → Rename it to "Najnoviji oglasi" when there are no featured
jobs, and always render a "Pogledaj sve poslove →" link. → **S** →
`features/home/home-popular-jobs-strip.tsx`, `app/[locale]/page.tsx`,
`messages/*.json`.

**NAV-3 No employer entry point in the header.** Employers are the paying side,
but the header only has "Prijava". Every job board puts "Za poslodavce / Objavi
oglas" top-right. → Add a secondary (outline) "Objavi oglas" link → `/employers`
landing or `/employer/register`, next to the primary "Prijava". → **S** →
`site-header.tsx`, `site-mobile-nav.tsx`.

**NAV-4 Spotlights link to empty results.** Live home shows 10 category and 5 city
spotlights while there is 1 job, so most tiles lead to the empty state (which
currently shows dev copy, see CP-1). → It looks broken and teaches users the site
is empty. → Hide tiles with 0 jobs, or show the count ("IT · 1"). The landing
page already does this (`Druge oblasti: IT 1`). → **S** (frontend, if counts are
already in `taxonomy`; otherwise it's a CMS curation question, Q5) →
`home-spotlight-rail.tsx`, `page.tsx`.

**NAV-5 Staff sign-in sits in the public footer.** "Prijava za osoblje" →
`/moderator/login` on every public page. → It's noise for users and a free hint
for anyone probing. → Remove it from `site-footer.tsx`. Staff can bookmark the URL. →
**S** → `components/site-footer.tsx`.

**NAV-6 The footer has gaps and duplicates.** "Prijava" appears under both
Kandidati and Poslodavci (both → `/sign-in`). There is no "O platformi", no
contact, and no privacy/terms (legal copy pending, Phase E). The city/category
headings "PRONAĐI POSLOVE PO GRADOVIMA" wrap onto two uppercase lines at 1440.
→ Trust signals for a job board live in the footer: who runs it, how to contact
them, legal. → Shorten the headings to "Gradovi" / "Kategorije". Add an "O
platformi" + "Kontakt" column now, and legal links when the copy exists (leave
`TODO(Stefan)`). → **S** → `site-footer.tsx`, messages.

### 4. Public pages

**PUB-1 Hero search: tabs hide the inputs and the state.** `home-hero-search.tsx`
shows one input at a time behind "Po reči / Po gradu / Po kategoriji" tabs. Values
from the other tabs are still submitted as hidden inputs, so a user who picked
"Niš" and then typed "konobar" searches for both without seeing "Niš". The
`role="tablist"` has no tabpanels, `aria-controls` or arrow-key handling. → SSOT
§1.5.1 says a "single prominent search bar (title + location)". The mechanic
persona wants minimum typing. → Show keyword + city side by side (stacked at
375), category as chips below. Drop the fake tabs. → **M** →
`features/home/home-hero-search.tsx`.

**PUB-2 The mobile jobs list puts ~800px of filters before the first result**
(`phone-375/jobs-list.png`: the first card is at y≈850). There are two filter
systems: instant chips (top) and a form with "Primeni" (below). "Brza prijava"
sits in the "Objavljeno" row. The desktop shows "Savet: na desktopu izaberi oglas
da ga vidiš pored liste" _on desktop_. → [`content-priority`]. The design-system
search flags "hidden filters" as a pattern to avoid, so the answer is a sheet with
a visible count, not hiding them. → On <md: a sticky one-line bar (search input +
"Filteri (2)" button) opening a bottom sheet that holds both chips and selects.
Apply everything instantly, or everything on "Primeni", but not a mix. Put "Brza
prijava" in its own group. Remove the desktop tip. Give the chips `aria-pressed`. →
**M** (needs a Sheet primitive, see A11Y-3) → `jobs-filter-chips-bar.tsx`,
`jobs-filter-form.tsx`, `jobs-list-screen.tsx`.

**PUB-3 Empty and error states (live on prod).** `jobs-list-screen.tsx` uses
`emptyBody` ("…Lokalno možete pokrenuti seed SQL…"), `error404Hint` and
`errorNoApi` (`NEXT_PUBLIC_API_URL`, localhost:4000). The same `errorNoApi`
appears in `job-detail-screen.tsx`, `jobs-list-preview-pane.tsx`,
`public-company-page.tsx` and `employers-directory-view.tsx`. The empty state also
doesn't distinguish "no jobs at all" from "no jobs match your filters"
[`empty-states`, `error-recovery`]. → Write user copy: filtered-empty
("Nema oglasa za ove filtere" + "Obriši filtere" + popular categories);
global-empty; error ("Nešto nije u redu, pokušaj ponovo" + retry). Keep dev hints
behind `process.env.NODE_ENV === 'development'`. → **S** → files above,
`messages/{sr,en}.json`.

**PUB-4 No route-level loading, error or 404 UI.** There is no `loading.tsx`,
`error.tsx` or `not-found.tsx` under `app/` (only `global-error.tsx`). A wrong URL
gets Next's default 404, with no header, no language and no way back. SSOT
§1.5.1: "Skeleton + streaming SSR, never blank-screen waits." →
Add `app/[locale]/not-found.tsx` (branded, search box + links to Poslovi /
Početna), `app/[locale]/error.tsx` (retry), and `loading.tsx` for `/jobs`,
`/jobs/[jobRef]` and the workspaces, reusing `PublicJobCardSkeleton` and
`table-loading-state.tsx` [`progressive-loading`]. → **S–M** → `app/[locale]/**`.

**PUB-5 The company page is thin** (`company.png`). It has a name, a count and the
list, with no logo, about text, website or city, and a ghost-underlined "Nazad na
poslodavce" in a different style from the jobs page's "Nazad na poslove". Some of
this is data that doesn't exist yet (`PROGRESS.md`: no logo or website stored). →
For now, align the back-link style (one `BackLink` component with a chevron
icon), use the shared container, and reserve a header slot for logo and
description. → **S** → `public-company-page.tsx`.

### 5. Forms & auth

**FRM-1 "Ispravite označena polja" — but nothing is marked.** Every step of
`employer-register-form.tsx` calls `setClientError(tReg('validationFailed'))`,
which shows one amber `role="status"` line under the form. No field gets
`aria-invalid`, a red border or its own message. Only 14 `aria-invalid` or
`aria-describedby` usages exist in the whole app [`error-placement`,
`error-clarity`, `focus-management`]. → Track errors per field. Render
`<p id="x-error">` under the field with `aria-describedby` + `aria-invalid`, and
focus the first invalid field. Style `aria-invalid:border-destructive` once in
`Input`/`Select`. Use `role="alert"` + destructive colour, not amber/status. shadcn's
`Field`/`FieldError` pattern is the reference; you don't need react-hook-form to
use it. → **M** → `employer-register-form.tsx`, `candidate-register-form.tsx`,
`job-draft-form-page.tsx`, `components/ui/input.tsx`, `select.tsx`.

**FRM-2 Employer signup is 4 steps before the first ad.** The steps are Account →
Company → Address → Bank & billing (IBAN/SWIFT for foreign companies). SSOT §1.2
says "≤ 3 steps to post", and the restaurant-owner persona targets <5 min to
first publish. → Billing data is only needed at purchase. → Collect account +
company (PIB/MB) at signup. Ask for address and billing at checkout, pre-filled
from what's known [`progressive-disclosure`]. This is mostly a frontend
reordering if the API accepts partial company data. If it doesn't, that's a
question for you (Q6). The stepper should also expose `aria-current="step"`. →
**M** → `employer-register-form.tsx`, packages/checkout flow.

**FRM-3 The apply flow leaks the job.** From the job page, "Napravi nalog kandidata"
links to `/candidate/register` **without `returnTo`**. The sign-in link has one.
After registering and verifying email, the candidate has lost the job they came
for. SSOT time-to-first-apply is <90s. → Pass `returnTo` through register →
verify-email → apply. → **S** → `job-listing-preview.tsx`, candidate register
screen.

**FRM-4 Small form inconsistencies.** Labels are styled per form
(`text-xs uppercase tracking-wide` in all login/register forms; 77 `uppercase`
uses app-wide). Small uppercase labels read worse than sentence case at 12px. The
`PasswordInput` toggle is `h-10` inside `h-11` inputs (4px misaligned). The
resume `<Label>` in `candidate-job-apply-form.tsx` has no `htmlFor`. Required
fields aren't marked [`required-indicators`]. → Move the label style into the
`Label` primitive (sentence case, `text-sm font-medium`). Make the toggle
`h-full`. Add `htmlFor`. Mark optional fields ("(opciono)") rather than required
ones, since most are required. → **S** → `components/ui/label.tsx`,
`password-input.tsx`, auth forms.

**FRM-5 Guests who click "Sačuvaj pretragu" get an error toast.** The 401 shows
"Prijavi se da čuvaš" as `toast.error`. The success toast promises alerts "kada
alarmi budu dostupni". → Don't show an error for an expected state. Show the
button with a lock hint and route guests to sign-in with `returnTo`. Consider
hiding the button until alerts actually send (Q3). → **S** →
`jobs-filter-chips-bar.tsx`.

### 6. Logged-in areas

**APP-1 Four copy-pasted shells and navs.** `candidate-workspace-shell.tsx`,
`employer-workspace-shell.tsx`, `moderator-workspace-shell.tsx`,
`admin-workspace-shell.tsx` and their `*-workspace-nav.tsx` files differ only in
data. `site-mobile-nav.tsx` repeats the same link markup five times. The
candidate nav has `my-8` and `mb-8` together. Nav links don't set `aria-current`
(1 use app-wide) [`nav-state-active`]. → It's consistent today, but it will drift.
→ Extract `WorkspaceShell({ eyebrow, title, subtitle, banner, links })` and one
`WorkspaceNav` that sets `aria-current="page"`. → **S–M** → those 9 files.

**APP-2 Workspace headers are placeholders.** The header card shows a label pill
("Radni prostor kompanije", "Aktivan profil"), the user's name and email, and for
employers "Javni URL identifikator: `slug`" in monospace. The employer dashboard
(`employer-dashboard-home.tsx`) shows three static explanation cards and no
numbers. → The first screen after login should answer "what needs me now?" → Show
counts from endpoints you already call: active ads with expiry ("Ostalo 5
dana", SSOT §1.3), new applications, and package status. Replace the slug line
with a "Pogledaj javni profil" link. → **M** → `employer-dashboard-home.tsx`,
shells.

**APP-3 Destructive actions don't confirm.** Withdrawing an application
(`candidate-applications-table.tsx`) is one click in a dropdown and irreversible.
Moderators/admins use `window.confirm` (`moderator-company-sales-actions.tsx`,
`admin-taxonomy-panel.tsx`), which is unstyled and English-chromed in some
browsers [`confirmation-dialogs`, `destructive-emphasis`]. → Add an
`AlertDialog` primitive and use it for withdraw, delete and close-lost. → **S**
once the dialog primitive exists (A11Y-3).

**APP-4 "Withdrawn" shows as danger.** In `applicationPipelineStatusTone`,
withdrawn is the candidate's own choice but renders red like a rejection. →
Make it `neutral`. → **S** → `components/table-status-badge.tsx`.

**APP-5 Staff UI still has English and jargon.** The sr strings "Status",
"Lead pool" (`Moderator.companies.viewPool`) and "OPTIONAL-PROMO" are fine for
internal staff. Flag them only if moderators aren't comfortable in English. Low
priority.

### 7. Accessibility

axe passes on the covered pages, but axe accepts a placeholder as a name and can't
judge focus visibility or target size. These need manual fixes:

**A11Y-1 The hero search has no label and no focus indicator.** It is
`<input type="search" … className="… outline-none">` inside a pill with no
`focus-within` ring. The city/category triggers set `focus-visible:ring-0`.
The most important input on the site is invisible to keyboard users
[`focus-states`, `input-labels`]. → Add an `sr-only` label (or a visible one) and
`focus-within:ring-2 ring-ring` on the pill. → **S** → `home-hero-search.tsx`.

**A11Y-2 Custom links lack explicit focus styles.** The header nav pills
(`site-main-nav.tsx`), the header "Prijava" link, `LocaleSwitcher`, footer links
and mobile-nav rows rely on the browser outline tinted by the base
`outline-ring/50` (half-opacity teal). It's visible, but weak on the glass header
[`focus-appearance`]. → Add a shared `focus-visible:ring-2 ring-ring
ring-offset-2` utility (or `@layer base a:focus-visible`) so links match
`Button`. → **S** → `global.css`.

**A11Y-3 The mobile menu is hand-rolled.** `site-mobile-nav.tsx` uses a `☰` text
glyph [`no-emoji-icons`], has no Escape-to-close, no focus move or trap, and no
focus return. The overlay is a second `<button>` with the same `aria-label` as the
toggle. The panel is `absolute w-72` rather than full-height. **There is no
logout on mobile**, because `UserProfileDropdown` is `hidden md:block`. →
Keyboard and screen-reader users get lost, and phone users can't sign out
[`modal-escape`, `destructive-nav-separation`]. → Add
`@radix-ui/react-dialog` and build the shadcn `Sheet`. This is a new dependency;
the reason is focus trap, Escape and scroll lock, and the same primitive serves
the filter sheet (PUB-2) and confirmations (APP-3). Use lucide `Menu`/`X`, and
put account + logout at the bottom of the sheet. → **M** → `site-mobile-nav.tsx`,
`components/ui/sheet.tsx` (new).

**A11Y-4 Touch targets.** Measured from classes: filter chips `h-8` (32px), locale
switcher ~28px, header nav pills ~32px, header "Prijava" ~36px, `Button size=sm`
36px, mobile-menu rows ~36px, footer links ~20px line boxes. These pass WCAG 2.2
AA (24px), but the checklist target for a mobile-first mass-market product is
44px [`touch-target-size`, `touch-friendly-input`]. → On <md: chips and menu rows
`min-h-11`, locale switcher `h-10`, footer links `py-2`. Keep desktop compact. →
**S** → the files named.

**A11Y-5 No `prefers-reduced-motion`.** Zero uses. Animated: `hf-section-fade-in`,
`hf-primary-glow-hover`, `active:scale-[0.98]`, the spotlight accordion and
`tw-animate-css` [`reduced-motion`]. → Add one
`@media (prefers-reduced-motion: reduce)` block in `global.css` that zeroes
animation and transition durations, and use `motion-safe:` on scale effects. →
**S** → `global.css`.

**A11Y-6 No skip link.** `site-shell.tsx` wraps pages in a `div`. The sticky
header plus the workspace sticky nav make tabbing to content long [`skip-links`].
→ Add a "Preskoči na sadržaj" link as the first child of the shell, targeting
`id="main"` on each page's `<main>`. → **S**.

**A11Y-7 Selection state is visual only.** The selected job card shows only a
left border (no `aria-current`). Filter chips are buttons with no
`aria-pressed`. The wordmark `<span aria-label>` has no role, so the label is
ignored; the link already has one, so drop it. → **S** → `public-job-card.tsx`,
`jobs-filter-chips-bar.tsx`, `brand-wordmark.tsx`.

### 8. Mobile (375 vs 1440)

- **Filters before results** — PUB-2. This is the biggest mobile issue.
- **No sticky apply** on the job page — VD-3. On `phone-375/job-detail.png` the
  apply button is below the fold even with a one-line description.
- **The home page is 3345px tall at 375** with only one job. "Kako funkcioniše"
  stacks into three tall blocks, and the audience cards repeat the sign-in
  chooser. → On mobile, collapse "Kako funkcioniše" into a compact 3-row list
  (icon + one line), and consider dropping the audience cards once the header has
  "Objavi oglas" (NAV-3). → **S** → `home-how-it-works.tsx`, `page.tsx`.
- **The footer is ~900px at 375** (six stacked columns). → Use a 2-column grid on
  mobile or accordions for the city/category lists. → **S** → `site-footer.tsx`.
- **Header at 375 is good:** mark only, language, menu. Keep it.
- **Employer flows on mobile are unreviewed.** There are no baselines for
  `/employer/*` at 375, but the restaurant-owner persona posts from a phone.
  `job-draft-form-page.tsx` (1046 lines) needs a 375 pass and a visual baseline. →
  **M**.

### 9. Copy & i18n

**CP-1 Developer text in user copy (live).** See PUB-3. Also
`Employer.jobForm.externalUrlHint` (`EXTERNAL_APPLY_HOST_ALLOWLIST`),
`Employer.packages.loadErrorStaleApi` (`pnpm dev:api`, `GET /api/...`),
`catalogEmptyHint` (`drizzle/0012_*`, seed path), `taxonomyMissing`, and
`Moderator.staffApi.unconfigured`. → **S** → `messages/{sr,en}.json` + dev gating in the
components.

**CP-2 English enum labels on Serbian pages.** `humanizeEnum()` is used in
`public-job-card.tsx`, `public-job-teaser-card.tsx`, `job-listing-preview.tsx`,
`jobs-filter-chips-bar.tsx` and `public-company-page.tsx`. The translations already
exist under `Employer.jobForm.wm/et/sen` ("U kancelariji", "Puno radno vreme",
"Medior", …). → Move them to a shared `Enums` namespace, add a `useEnumLabel()`
helper, and delete `humanizeEnum`. Also: "Easy Apply" in `Home.howStep2Body`, but
the chip says "Brza prijava". Pick one. → **S**.

**CP-3 "Prijava" overload.** Nav "Prijava" = sign in. JobDetail `applyTitle`
"Prijava" = application. `applyButton` "Prijavi se na ovaj posao" = apply.
`applySignIn` "Prijavi se da konkurišeš" = sign in. Home `candidatePortalPrimary`
"Prijava" = sign in. → For a first-time user, "Prijavi se" is ambiguous on the
exact page where conversion happens. → Proposal (your call, Q2): **apply =
"Konkuriši"** (button "Konkuriši za ovaj posao", section "Konkurisanje"), **auth
= "Prijavi se" / "Prijava"**, **register = "Napravi nalog"**. → **S**.

**CP-4 Mixed ti/vi.** Examples: `Home.subhead` "Otkrijte … vama" vs `howStep1Title`
"Pretraži"; `Jobs.listDescription` "Pretražite" vs `twoColumnNavHint` "izaberi";
`JobDetail.applyHint` "Prijavite se" vs `applySignIn` "Prijavi se"; all of
`SignIn` uses ti. The SSOT examples ("Tvoj oglas je objavljen", "Tražiš
posao?") point to **ti**. → Standardise on ti for candidates. Decide whether
employer billing copy stays on vi (Q2). Run one pass over `sr.json`. → **M**
(1137 keys, but mechanical).

**CP-5 Serbian style slips.**

- Title case in Serbian: "Pronađi Svoj Sledeći Korak u Karijeri". Serbian uses
  sentence case: "Pronađi svoj sledeći korak u karijeri".
- `audiencePathsTitleAccent` "dva puta" is a calque of "Two Paths" and reads as
  "twice". Use "dva puta" → "dva pravca" or rewrite as "Za kandidate i
  poslodavce".
- Missing diacritics: `JobDetail.errorNoApi` "moze", `errorNotFound` "vise",
  `errorGeneric` "moguce ucitati", and two more "moze" in other namespaces.
- "Učitano 1 odgovarajućih oglasa" has no plural rules. Use ICU
  `{count, plural, one {# odgovarajući oglas} few {# odgovarajuća oglasa} other {# odgovarajućih oglasa}}`.
  The same applies to "1 otvorena pozicija", "Trenutno 1 aktivan oglas" and any
  other count.
- SSOT §1.3 says no "portal": `SignIn.subtitle` "Izaberi portal…", `Home.staffPortalTitle`.
- Corporate tone vs the mass-market persona: "top prilike", "Pronađi Svoj Sledeći
  Korak u Karijeri". SSOT promise lines are much better: "Tražiš posao? Nađi ga
  odmah." Use them as the hero.

→ **S** → `messages/sr.json` (+ en for plurals).

**CP-6 Unbacked claims are waiting in the messages.** `Home.trustStrip` "Više od
500 poslodavaca širom Srbije" isn't rendered today (`HomeTrustStrip` is unused),
but prod has no real users. `Home.subhead` says "verifikovanih poslodavaca". →
Delete `trustStrip` and the unused component so the claim can't ship by accident.
Confirm what "verified" means before keeping it (Q7). → **S**.

---

## Prioritized roadmap

### Now (quick wins, ≤ 1 day total, mostly S)

1. Show Poslovi/Poslodavci to guests; drop "Početna"; add "Objavi oglas" — NAV-1, NAV-3.
2. Rewrite empty/error copy, gate dev hints behind development, delete
   `trustStrip` — PUB-3, CP-1, CP-6.
3. Translate enum chips (shared `Enums` namespace) — CP-2.
4. Home: "Najnoviji oglasi" + always-visible "Pogledaj sve poslove" — NAV-2.
5. Hero search label + focus ring; global link focus style; reduced-motion block;
   skip link — A11Y-1, A11Y-2, A11Y-5, A11Y-6.
6. `--input` to 3:1; fix the featured banner contrast (gold + dark text) — DS-7, VD-2.
7. `returnTo` on "Napravi nalog kandidata" — FRM-3.
8. Serbian copy pass for title case, "dva puta", diacritics, plurals, "portal" — CP-5.
9. Remove staff login from the footer; withdrawn → neutral — NAV-5, APP-4.

### Next (1–2 weeks)

1. Status tokens + `TableStatusBadge` on tokens; token swap in the 3 big public
   files; checker allowlist — DS-1, DS-2, DS-8.
2. Web font via `next/font` (latin-ext) + type scale + re-baseline visuals — DS-4, DS-3.
3. Sheet primitive (`@radix-ui/react-dialog`) → mobile menu with logout, mobile
   filter sheet, AlertDialog for withdraw/delete — A11Y-3, PUB-2, APP-3.
4. Job page restructure: CTA on top, sticky apply on mobile, sidebar on desktop — VD-3.
5. Per-field form errors in register forms and the job draft form — FRM-1.
6. Apply vs sign-in wording and the ti/vi pass — CP-3, CP-4 (after Q2).
7. `not-found.tsx`, `error.tsx`, `loading.tsx` — PUB-4.
8. Hero: keyword + city side by side — PUB-1.

### Later

1. Flatten visual language (drop orbs/glass), radius and elevation rules baked
   into primitives — VD-1, DS-5.
2. One `WorkspaceShell`/`WorkspaceNav`; employer dashboard with real counts — APP-1, APP-2.
3. Employer signup → 2 steps, billing at checkout — FRM-2 (after Q6).
4. Dark mode: ship or delete; remove unused gradient tokens — DS-6 (after Q1).
5. Container alignment, company page header, relative dates, salary slot — VD-4, PUB-5, VD-5.
6. 375 pass + visual baselines for employer flows; then make `check:design`
   blocking per clean directory and add a 44px target check to e2e.

---

## Open questions for Stefan

1. **Dark mode:** ship it this year, or delete `.dark` and the `dark:` classes
   until there's demand? (I'd delete it now and re-add it later; it costs a
   contrast pass on every new component.)
2. **Voice:** ti everywhere, or ti for candidates and vi for employer
   billing/invoices? And is "Konkuriši" acceptable as the apply verb (vs
   "Pošalji prijavu")?
3. **Saved searches:** keep "Sačuvaj pretragu" visible before alerts actually send
   email, or hide it until the worker sends them?
4. **Salary:** is salary on the roadmap (SSOT §1.5.1 says adopt it)? If yes, I'd
   reserve the card slot now. If not, the SSOT should say so.
5. **Home spotlights:** CMS-curated (Sanity) or driven by job counts? This
   decides whether empty tiles are a frontend or an editorial fix.
6. **Employer signup:** may companies post (or start a draft) before
   address/billing are filled in, i.e. can billing move to checkout? This depends
   on the API accepting a partial company.
7. **"Verifikovani poslodavci":** what verification actually happens
   (moderator-approved companies? PIB check?). If none, the hero claim should go.
8. **Font:** any brand preference? Otherwise I'd go with Inter or Manrope
   (latin-ext + Cyrillic, in case `/sr-Cyrl` happens).
9. **Wordmark:** `brand-wordmark.tsx` is marked "THROWAWAY placeholder". Is a
   designed wordmark coming with logo concept A, or is gradient text final?
