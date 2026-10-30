# Needs Stefan

Things Claude could not (or must not) do alone. Newest first within each
priority. Remove an item when it is done. **No secrets in this file.**

## ▶ Next, in order (updated 2026-10-29)

1. Sanity webhook (~1 min): the webhook secret was rotated at 11:41 UTC, so
   the webhook still sends the old one and the site answers 401 (CMS edits
   then take up to 5 minutes). Sanity → project `o85214ma` → API → Webhooks
   → `sljakam.com revalidate` → Edit → HTTP header
   `x-sanity-webhook-secret` = the new `SANITY_WEBHOOK_SECRET` from the
   server (`grep ^SANITY_WEBHOOK_SECRET= deploy/.env.production | cut -d= -f2-`).
2. Redesign A (2026-10-29, #60–#64): staging has every step; production
   is the manual `deploy-production` run when you are happy with staging.
   After it: deploy the Studio so editors see the new **Logo** field on
   Employer branding (command in `docs/deployment/hetzner.md` §6; the old
   one could not find the CLI, and the live Studio crashes on "Missing
   Sanity Studio project id" until a build with `fix/cms-studio-env` is
   deployed), then upload logos; cards show initials until then. The shared Sanity data already
   has #59's home tiles, About and navigation (seeded 2026-10-30), so
   sljakam.com shows **no category tiles until this deploy** (its database
   still has the old categories).
3. When convenient: `sudo systemctl restart docker` (item 2), Sentry (3),
   accountant (4), legal texts (5), Phase T decisions, social profiles,
   analytics, Google Indexing API.

## ✅ Done

- **City photos** (2026-10-30): Beograd, Novi Sad and Niš from Pixabay
  (Stefan's picks), Kragujevac (CC0) and Subotica (public domain) from
  Wikimedia Commons; sources in `scripts/cms/home-images/cities/SOURCES.md`.
  Seeded to the `development` and `production` datasets. The Pixabay ones are
  1280 px (API limit); originals from the linked pages would be sharper.
- **Launch setup** (2026-10-29): production admin password set from the
  reset email; the secrets seen in a screenshot rotated; `INDEXNOW_KEY` set
  (public by design, served at `/<key>.txt`; the worker announces every
  published job); Search Console (Domain property, DNS TXT) and Bing
  (imported from Google) verified, `https://sljakam.com/sitemap.xml`
  submitted in both, status Success.
- **Seed sample job** gone: the production database was wiped of users,
  companies and jobs on 2026-10-29 (config kept; backup
  `hireforge-postgres-20261029T085158Z.sql.gz`).
- **Sanity project `o85214ma`** (2026-10-29): owned by Stefan, content
  seeded and rebranded, Studio at https://sljakam.sanity.studio, publish
  webhook verified (an edit is live on sljakam.com in ~2 s).
- **Seed passwords rotated** on production (2026-10-28) and the five
  accounts' sessions revoked; verified: no account uses the seed password,
  the old admin password is rejected on the live site. New passwords are in
  `~/hireforge-prod-credentials-2026-10-28.txt` on Stefan's Mac (kept on
  purpose, outside the repo — never commit it).
- **Resend domain** `sljakam.com` confirmed verified.
- **Slim images + safe deploys** (2026-10-29): images ~0.7–0.9 GB (were
  ~4.5 GB), disk 90% → 13%; `scripts/deploy/ship.sh` with backup, health
  gates, automatic rollback (proven on a real deploy) and image pruning.
- **Restore drill** passed on production (2026-10-29,
  `scripts/deploy/restore-check.sh`): the dump restores with identical
  table and row counts.
- **Nightly Postgres backup** installed on the VM (cron 02:17 server time,
  keeps 14 days; `backups/backup-cron.log`). Checked 2026-10-28.
- **SEO and guest access option B** live: public pages, sitemap, JobPosting
  markup (#7, #13); every job public and indexed, guests see the first 20
  of any list (#31, replaced #20's featured-only rule).
- **Off-server backups** (2026-10-29): bucket `hireforge` (DEVLEGION, nbg1,
  private); every nightly and deploy dump is uploaded and kept 30 days;
  restore from the bucket checked. Keys rotated once already (the first
  pair was visible in chat). How to rotate: `docs/deployment/hetzner.md` §8.
- **Swap** (2026-10-29): 4 GB `/swapfile`, in `/etc/fstab`.
- **Deploy pipeline** (2026-10-29, #35, #37): a merge to `main` deploys to
  staging by itself; production = Actions → `deploy-production` → the
  commit staging ran → you approve. CI deploy key (`DEPLOY_SSH_KEY`,
  `hireforge-github-actions-deploy` on the VM) and the `production`
  environment set up by Stefan; first run green.
- **Staging** (2026-10-29): https://staging.sljakam.com, open (no login,
  `noindex`), own checkout `/opt/hireforge-staging`, same seed accounts as
  production with production's passwords. Shares the Sanity read token, the
  bucket and the Resend key, every email sent to Stefan's inbox (test email
  received 2026-10-29); `docs/deployment/hetzner.md` §10.

## 🟠 Soon

### 2. Free the Docker daemon's memory (optional)

The Docker daemon still holds ~1.8 GB from loading the old 4.5 GB images.
Swap (4 GB, added 2026-10-29) covers it, so this is no longer urgent; when
convenient, in your SSH session: `sudo systemctl restart docker` (~30 s
downtime, containers come back; check no deploy is running). It needs the
`deploy` user's Linux password (not the SSH key). Lost it? Hetzner Console
→ the server → Rescue → Reset root password, then the web Console as root:
`passwd deploy`.

### 3. Sentry

Create a Sentry project (or say which error tracker you want) and put the
DSN in `deploy/.env.production` as `SENTRY_DSN`; wiring is Phase D.

### 4. Accountant: VAT status and invoice content (Phase D)

The billing design assumes no VAT and in-house numbered PDFs. Confirm with
an accountant: is the legal entity in the VAT system, does B2B invoicing
need SEF (eFaktura), and which fields the invoice must carry (seller/buyer
PIB, MB, address, line items, date of supply). Code has `TODO(Stefan)`
markers where this matters.

### 5. Legal texts

Privacy policy, terms of use and refund policy pages need real legal copy
(Serbian + English). The pages and footer links are Phase D; send the texts
(or publish them as Sanity editorial pages) and they can go live.

## 🟡 Decide when convenient

## Phase T: decisions (found by the new tests)

- [ ] **Billing emails** go to one arbitrary employer of the company, not to
      the company's `billing_email`, and failures are not retried. Intended?
- [ ] **Worker without `RESEND_API_KEY` in production:** every notification
      is silently skipped. Refuse to start, like the API's production guard?
- [ ] **`GET /api/integration` is public** and enqueues a BullMQ job and pings
      Sanity on every call. Keep, put behind a token, or remove?
- [ ] **External images in job descriptions** (any https host) allow
      tracking pixels. Restrict to uploaded media?

## SEO and reach: decisions

The full to-do list for search and reach, ordered by impact:
`docs/plans/SEO_REACH_CHECKLIST.md`.

- [ ] **Logo** (you asked for a designed mark on 2026-10-28). Picked concept A:
      an "S" whose caron is a gold check mark ("the job is yours"), on the
      brand teal. Concepts A/B/C side by side: `docs/design/logo-concepts.png`
      (B: caron as a spark, C: location pin). Header mark:
      `apps/web/src/components/brand-mark.tsx`; icons and favicon:
      `node scripts/design/make-icons.mjs`. Say the word to switch.

## Values

- [ ] **Social profiles** for Organization `sameAs` (JSON-LD): official
      Instagram / LinkedIn / Facebook URLs, if any. Code:
      `SOCIAL_PROFILES` in `apps/web/src/lib/seo/json-ld.ts`.
- [ ] **Google Indexing API**: in Google Cloud create a service account,
      enable the "Web Search Indexing API", download its JSON key, add the
      account's email as an **Owner** of sljakam.com in Search Console, and
      put the key base64-encoded (`base64 -i key.json`) in
      `deploy/.env.production` as `GOOGLE_INDEXING_SA_JSON`; restart
      `worker`. Not in chat.
- [ ] **Analytics**: none is installed (by design in this branch). Choose GA4
      (needs the cookie consent banner) or a cookieless tool (Plausible,
      Umami, Cloudflare Web Analytics: no banner needed).
