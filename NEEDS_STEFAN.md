# Needs Stefan

Things Claude could not (or must not) do alone. Newest first within each
priority. Remove an item when it is done. **No secrets in this file.**

## ▶ Next, in order (updated 2026-10-29)

1. Deploy pipeline (item 1, ~5 min): the CI deploy key and the
   `production` approval. Until then merges don't reach staging.
2. Rotate the secrets that were visible in a screenshot (item 2).
3. Server (~2 min): set `INDEXNOW_KEY` (see "Values").
4. Admin UI: archive the seed sample job (see "Values").
5. Google Search Console + Bing Webmaster Tools, submit the sitemap
   (see "Values"). Worth doing now: verification takes days to settle.
6. When convenient: `sudo systemctl restart docker` (item 3), Sentry (4),
   accountant (5), legal texts (6), Phase T decisions, social profiles,
   analytics.

## ✅ Done

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
- **Staging** (2026-10-29): https://staging.sljakam.com, basic auth
  (`grep STAGING_BASIC_AUTH /opt/hireforge-staging/deploy/.env.staging` on
  the VM), own checkout `/opt/hireforge-staging`, same seed accounts as
  production with production's passwords. Shares the Sanity read token, the
  bucket and (once the redirect is live) the Resend key with every email
  sent to Stefan's inbox; `docs/deployment/hetzner.md` §10.

## 🟠 Soon

### 1. Deploy pipeline: CI deploy key and approval (~5 min)

The `deploy-staging` / `deploy-production` workflows (like autofind:
merge → staging by itself, production by hand with your approval) need a
key that lets GitHub Actions log in to the server as `deploy`. Claude was
not allowed to create that access, so it is yours: on your Mac, in this
repo, run the commands Claude gave you in chat (2026-10-29), or by hand:

1. `ssh-keygen -t ed25519 -N '' -C hireforge-github-actions-deploy -f /tmp/hf-ci`
2. Append `/tmp/hf-ci.pub` to `~/.ssh/authorized_keys` of `deploy` on the VM
   (prefixed with `no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty `).
3. `gh secret set DEPLOY_SSH_KEY < /tmp/hf-ci`, then `rm /tmp/hf-ci*`.
4. `gh variable set DEPLOY_HOST --body 178.105.128.190`,
   `gh variable set DEPLOY_USER --body deploy`,
   `gh variable set DEPLOY_HOST_KEY --body "$(ssh-keyscan -t ed25519 178.105.128.190 2>/dev/null | cut -d' ' -f2-)"`.
5. GitHub → Settings → Environments: `staging` (no rules) and `production`
   with **Required reviewers: you**.

Then say "pipeline keys done": Claude runs `deploy-staging` once and checks
it. After that, deploy production from Actions → `deploy-production`.

### 2. Rotate the secrets seen in a screenshot

On 2026-10-29 a screenshot of `deploy/.env.production` showed these; replace
each on the VM (`nano deploy/.env.production`), never in chat:

- `SANITY_API_WRITE_TOKEN`: production doesn't need it (only the manual
  `cms:seed`). Delete the token at sanity.io/manage → API → Tokens and leave
  the line empty.
- `RESEND_API_KEY`: resend.com → API Keys → create (sending, sljakam.com),
  replace, delete the old key.
- `SANITY_API_READ_TOKEN`: new Viewer token, replace, delete the old one.
- `SANITY_WEBHOOK_SECRET`: `openssl rand -hex 32`; also edit the Sanity
  webhook URL (`…/api/revalidate/sanity?secret=<new>`).
- `CMS_SYNC_SECRET`: `openssl rand -hex 32` (nothing else to update).

Then `docker compose -f compose.prod.yml up -d --no-build --pull never --wait`
(or say "secrets rotated"). Staging takes the shared ones on its next deploy.

### 3. Free the Docker daemon's memory (optional)

The Docker daemon still holds ~1.8 GB from loading the old 4.5 GB images.
Swap (4 GB, added 2026-10-29) covers it, so this is no longer urgent; when
convenient, in your SSH session: `sudo systemctl restart docker` (~30 s
downtime, containers come back; check no deploy is running). It needs the
`deploy` user's Linux password (not the SSH key). Lost it? Hetzner Console
→ the server → Rescue → Reset root password, then the web Console as root:
`passwd deploy`.

### 4. Sentry

Create a Sentry project (or say which error tracker you want) and put the
DSN in `deploy/.env.production` as `SENTRY_DSN`; wiring is Phase D.

### 5. Accountant: VAT status and invoice content (Phase D)

The billing design assumes no VAT and in-house numbered PDFs. Confirm with
an accountant: is the legal entity in the VAT system, does B2B invoicing
need SEF (eFaktura), and which fields the invoice must carry (seller/buyer
PIB, MB, address, line items, date of supply). Code has `TODO(Stefan)`
markers where this matters.

### 6. Legal texts

Privacy policy, terms of use and refund policy pages need real legal copy
(Serbian + English). The pages and footer links are Phase D; send the texts
(or publish them as Sanity editorial pages) and they can go live.

## 🟡 Decide when convenient

## Phase T: decisions (found by the new tests)

- [ ] **Moderator scope for employer accounts:** may a moderator move an
      employer into a company outside their pipeline (today: any)? Same for
      `GET /moderator/employers` (lists every employer) and
      `POST /moderator/jobs` / the job composer bootstrap (any company).
- [ ] **Cover letters:** should employers see them? Collected and stored,
      never shown.
- [ ] **Draft images:** may images of unpublished jobs be fetched by URL? If
      not, `getPublicFile` needs a status check (and the editor preview must
      load drafts' images through an authenticated route).
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
- [ ] **Search Console and Bing Webmaster Tools.** Easiest: in Search
      Console add a **Domain** property `sljakam.com` and verify with the DNS
      TXT record at the domain registrar (no server change; covers `www`).
      Then Bing Webmaster Tools → "Import from Google Search Console". Submit
      `https://sljakam.com/sitemap.xml` in both. Meta tag method instead:
      put the codes in `deploy/.env.production` as
      `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` /
      `YANDEX_SITE_VERIFICATION` and recreate `web`.
- [ ] **Google Indexing API**: in Google Cloud create a service account,
      enable the "Web Search Indexing API", download its JSON key, add the
      account's email as an **Owner** of sljakam.com in Search Console, and
      put the key base64-encoded (`base64 -i key.json`) in
      `deploy/.env.production` as `GOOGLE_INDEXING_SA_JSON`; restart
      `worker`. Not in chat.
- [ ] **`INDEXNOW_KEY`** (not secret; served at `/<key>.txt`). On the VM:

  ```bash
  cd /opt/hireforge
  grep -q '^INDEXNOW_KEY=' deploy/.env.production || echo "INDEXNOW_KEY=$(openssl rand -hex 16)" >> deploy/.env.production
  docker compose -f compose.prod.yml up -d --no-build --force-recreate web worker
  curl -s https://sljakam.com/$(grep '^INDEXNOW_KEY=' deploy/.env.production | cut -d= -f2).txt; echo
  ```

  The last line prints the key back when it works. Every published job is
  announced.

- [ ] **Analytics**: none is installed (by design in this branch). Choose GA4
      (needs the cookie consent banner) or a cookieless tool (Plausible,
      Umami, Cloudflare Web Analytics: no banner needed).

- [ ] **Archive the seed sample job on prod**: "Senior TypeScript developer"
      (DEVLEGION, `20000000-0000-4000-8000-000000000001`, from
      `scripts/db/seed-domain-baseline.sql`). Since #31 every job is public,
      so this fake ad is indexed with JobPosting markup (against Google's
      job-posting rules). Archive it from the moderator/admin UI before
      submitting the sitemap (or say so and it gets archived).
