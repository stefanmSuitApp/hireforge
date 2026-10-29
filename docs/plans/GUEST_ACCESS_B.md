# Plan — Guest access "option B": every job public, browsing needs an account

Written 2026-10-29 from `origin/main` at `27ffff9` (after #20, #22, #23, #24).
Stefan chose option B on 2026-10-29. This replaces the "featured public, the
rest teased" rule shipped in #20.

## 1. The rule

**Guests can read every job ad in full. Browsing more than the first page
of results needs an account.**

| Surface | Guest (not signed in) | Signed in (any role) |
|---|---|---|
| Job page `/jobs/[slug]` | Full ad, indexed, JobPosting JSON-LD | Same |
| Apply, save job, alerts | Need an account (inline sign-up, see §5) | Allowed |
| Jobs list `/jobs` and landing pages (city, category, city × category) | Page 1 only (20 jobs); a "see all N jobs" prompt below | Every page, infinite scroll |
| Keyword and city search | Allowed, page 1 of the results (decision D1) | Allowed |
| Advanced filters (work model, employment type, posted within, quick apply) | Visible, but using one opens the sign-in prompt (D1) | Allowed |
| Similar jobs on a job page | First 3, plus a "see more like this" prompt (D3) | All 6 |
| Company page `/companies/[slug]` | Company and its first 20 jobs | All jobs |
| Employers directory, home page strips | Unchanged (public) | Unchanged |

**Why this shape:**
- **Google.** Google for Jobs only lists an ad that the visitor can read on the page it links to. Every job page stays fully open, and the gating applies to browsing (lists, filters, page 2+), never to the ad itself.
- **Same for everyone.** Googlebot and people get the same page, so there's no cloaking risk.
- **Search engines still find every job.** The sitemap lists every live job (§4), so page 2+ being closed doesn't hide anything from them.
- **No intrusive pop-ups.** Prompts are inline blocks and a dismissible bottom bar, never a full-screen pop-up. Google ranks down intrusive interstitials for visitors arriving from search on phones.

**What featured (Šef/Gazda) now sells:** guests only see page 1, and featured jobs are pinned to the top of every list. So "your ad is what every visitor sees first, signed in or not" is concrete. Add the gold badge, the home page strip, and an instant push to Google on publish. The pitch on the packages page needs new wording: TODO(Stefan).

## 2. Decisions

D1 and D3 confirmed by Stefan on 2026-10-29. The others are defaults until he says otherwise.

| # | Question | Default |
|---|---|---|
| D1 | May guests search by keyword and city? | **Yes, page 1 of the results.** The hero search is the main way in, and the landing pages are already city/category filters that must stay public for SEO. Only the advanced filter chips and page 2+ need an account. |
| D2 | How many jobs does a guest see per list? | **20** (`JOBS_LIST_PAGE_SIZE`). |
| D3 | Similar jobs for guests? | **First 3, plus a prompt.** They are links between public pages, which also helps SEO. |
| D4 | A guest opens `?page=2` directly (old link, crawler) | **200 with page 1's jobs, the "see all" prompt and `noindex`.** Not a redirect: crawlers shouldn't hit redirect chains. Page 2+ is reached through the sitemap, not through the list. |
| D5 | The `PUBLIC_JOBS=false` full wall | **Keep it** as the emergency switch (unchanged behaviour). |

## 3. Server rules (API, the single source of truth)

The viewer comes from the access token the web already forwards (#20: `lib/viewer-access-token.ts`, `viewerOf(req)` in `public-jobs.controller.ts`). Any valid token counts as signed in.

- **`GET /public/jobs` (list).** For a guest: `page > 1` returns page 1 with `guestLimited: true`. An advanced filter (`workModel`, `employmentType`, `postedWithin`, `easyApply`) returns 401 `JOBS_SIGN_IN_REQUIRED`. Keyword, city and category keep working. The response gets `guestLimited: boolean` (true when the guest is seeing a capped list) next to `total`.
- **`GET /public/jobs/:id`, `/by-slug/:slug` (detail):** full detail for everyone. Remove the #20 `JOB_SIGN_IN_REQUIRED` 401 and its error code.
- **`GET /public/jobs/:id/similar`:** guests get the first 3 plus `moreAvailable: boolean`.
- **`GET /public/jobs/company/:slug`:** guests get the first 20 jobs plus `totalJobs`. Replace `lockedJobCount`.
- **`GET /public/jobs/previews`:** unchanged (home strips).
- **`GET /public/jobs/sitemap`:** all live jobs. Facets and companies count live jobs. Drop `featuredJobs` from the indexing logic; keep the field only if something still reads it.
- **Contracts:**
  - Remove `PublicJobListItem.locked` and `lockedTotal`.
  - Add `guestLimited` (list), `moreAvailable` (similar) and `totalJobs` (company).
  - Add a new coded error `JOBS_SIGN_IN_REQUIRED`, with `Errors.*` messages in sr and en.

## 4. SEO

- **Sitemap:** every live job, every landing page with at least 1 live job, every company with a live job (back to the pre-#20 counts).
- **JobPosting JSON-LD:** on every live job page (drop the `job.featured` condition).
- **Indexing worker:** IndexNow and the Google Indexing API for every job change again. Drop the "non-featured counts as deleted" rule from #20.
- **Landing pages:** `noindex` only when there are 0 live jobs. Page 2+ is `noindex` for guests and keeps its canonical.
- **`llms.txt`:** back to "job ads at /jobs/{slug}".
- **Docs:** update `docs/plans/SEO_REACH_CHECKLIST.md` §2 to "every live job".
- **After the deploy:** resubmit the sitemap in Search Console; the seed sample job must be archived first (checklist §1).

## 5. Web (UI and conversion)

- **List and landing pages:**
  - For guests, after the 20th card, a `GuestBrowseCta` block: "Prijavi se da vidiš svih {total} oglasa", with sign-in and "Napravi nalog". It replaces `LockedJobsCta`.
  - No infinite scroll and no "next page" link for guests.
  - Cards show the company again (remove the locked card variant and `publicJobCardHref`'s sign-in branch).
- **Advanced filter chips (guests):** visible but marked with a lock icon. Tapping one opens a sign-in sheet (the `Sheet` from #20) that says what they unlock. Its `returnTo` carries the chosen filter, so after sign-in the filter is applied.
- **Job page:**
  - **"Konkuriši" for guests:** opens an inline sign-up sheet (name, email, password, or a link to sign in), so the person never leaves the job. On success it continues to the apply form. Reuse the candidate register mutation with `returnTo`.
  - **Similar jobs:** 3 links, then "Prijavi se za još sličnih oglasa".
- **Bottom bar:** after the 3rd job page a guest views in a session, a small, dismissible bar: "Napravi nalog za 30 sekundi — brže konkurisanje i obaveštenja". It's stored per browser (localStorage) and never shown again after dismissing or signing up. Not shown on the auth pages.
- **Company page:** 20 jobs, then the same prompt.
- **Home:** unchanged.
- **Copy:** "ti" voice, "Konkuriši" for applying, "Prijavi se" only for sign-in. Use `Jobs.*` keys. Remove the #20 `locked*` keys.

## 6. What changes from #20 (refactor map)

| #20 piece | Option B |
|---|---|
| `isLockedFor` / `PublicViewer` in `public-jobs.service.ts` | Keep `PublicViewer`, delete `isLockedFor`. Add `guestPageCap()` and the filter check. |
| `locked`, `lockedTotal`, `lockedJobCount` in contracts | Replace with `guestLimited`, `moreAvailable`, `totalJobs`. |
| Detail 401 + web 307 to sign-in | Remove both (detail always 200). |
| `featuredJobs` in the sitemap feed, landing/company indexing | Back to `liveJobs`. |
| Worker: non-featured → URL_DELETED | Remove. |
| `LockedJobsCta`, locked card variant, `publicJobCardHref` | `GuestBrowseCta`; normal cards. |
| `viewer-access-token.ts`, BFF token forwarding, no-store for signed-in reads | **Keep** (B needs the viewer too). |
| e2e `guest-job-visibility.spec.ts`, int tests "guests see featured…" | Rewrite for the B rules. |
| `createPublishedJob({ featured })`, `insertJob({ featured })` | Keep; tests no longer need featured to see a job. |

## 7. Phases (each ships on its own: full check, CI, merge, deploy, verify)

- **B1 — API and contracts.**
  - The §3 rules, the new error code, removing the detail lock, the sitemap counts and the worker change.
  - Integration tests: the guest page cap, the filter 401, the detail being open, similar capped at 3, the company cap, the sitemap listing all jobs.
  - Web changes only as far as needed to compile and keep pages working; the CTAs come in B2.
- **B2 — Web browsing.**
  - The list, landing and company caps with `GuestBrowseCta`.
  - Locked filter chips with the sign-in sheet and `returnTo` carrying the filter.
  - Similar jobs capped at 3, page 2+ `noindex` for guests, JSON-LD on all jobs, `llms.txt`, the checklist doc.
  - e2e:
    - a guest sees 20 and the prompt;
    - a filter chip asks for sign-in, then applies the filter after it;
    - `?page=2` is noindex for a guest;
    - a signed-in user sees everything;
    - every job page is 200 with JSON-LD;
    - the sitemap lists all jobs.
- **B3 — Conversion.**
  - Inline sign-up on "Konkuriši" and the bottom bar after 3 job views.
  - e2e: a guest applies from the job page without leaving it; the bar shows on the 3rd view and stays dismissed.
- **B4 — Rollout.**
  - Deploy with `scripts/deploy/ship.sh`, then verify live: a job page as a guest, page 2 noindex, the sitemap, `seo:audit`, Lighthouse.
  - Archive the seed job (Stefan, checklist §1), resubmit the sitemap in Search Console, and watch impressions and sign-ups.

Estimated effort: B1 ½ day, B2 1 day, B3 1 day, B4 ½ day.

## 8. Risks

- **Fewer sign-ups than the teaser model.** Guests can now read every job. B3 (inline sign-up on apply) is where most accounts come from, so don't skip it.
- **Crawling.** Page 2+ is closed to crawlers too, so the sitemap must be complete and fresh. It already is, from the API, uncached for crawlers.
- **Duplicate-looking lists:** a guest's page 2 shows page 1's jobs. It's `noindex`, so search engines ignore it.
- **The packages page promise:** "visible to everyone" from #20 isn't true any more. Reword it (TODO(Stefan)).

## 9. Log

Implementing agents add dated entries here: what shipped, PR, what was skipped and why.
