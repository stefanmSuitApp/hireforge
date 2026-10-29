# Needs Stefan

Things Claude could not (or must not) do alone. Newest first within each
priority. Remove an item when it is done. **No secrets in this file.**

## ▶ Next, in order (updated 2026-10-29)

1. Server memory (item 2): `sudo systemctl restart docker` (frees ~1.8 GB,
   ~30 s downtime) and add swap. Staging waits on this.
2. Backup bucket (item 1): create it, put the keys in `deploy/.env.production`
   — the upload code is live and switches on by itself.
3. Staging (item 1b): DNS record, then say "staging go".
4. Server (~2 min): set `INDEXNOW_KEY` (see "Values").
5. Admin UI: archive the seed sample job (see "Values").
6. Google Search Console + Bing Webmaster Tools, submit the sitemap
   (see "Values"). Worth doing now: verification takes days to settle.
7. Get the first **featured** job live: with the featured-only rule nothing
   job-related is indexed until one exists.
8. When convenient: Sentry (3), accountant (4), legal texts (5), Phase T
   decisions, social profiles, analytics.

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
- **SEO and featured-only visibility** live: public pages, sitemap, JobPosting
  markup (#7, #13), guests see featured jobs in full and others as teasers
  (#20, deployed 2026-10-28).

## 🟠 Soon

### 1. Copy backups off the VM (code ready, needs the bucket)

The nightly dump and every deploy's dump sit on the VM's disk. The upload is
live and turns on once these are in `deploy/.env.production` (set them
yourself, never in chat):

1. Hetzner Console → **DEVLEGION** project → Object Storage → Create Bucket:
   Nuremberg (`nbg1`), name `hireforge`, Private, Object Lock off.
2. Manage credentials → Generate (`hireforge-prod`) → password manager.
   Hetzner keys reach every bucket in the project (autofind's too).
3. On the VM, `nano deploy/.env.production` (the S3 lines exist):

   ```
   S3_ENDPOINT=https://nbg1.your-objectstorage.com
   S3_REGION=nbg1
   AWS_ACCESS_KEY_ID=<from password manager>
   AWS_SECRET_ACCESS_KEY=<from password manager>
   S3_BACKUP_BUCKET=hireforge
   S3_BACKUP_PREFIX=backups/postgres/production/
   ```

   Leave `S3_JOB_MEDIA_BUCKET` / `S3_BILLING_BUCKET` empty (that would move
   uploads to the bucket without migrating existing files).

4. Test: `./scripts/deploy/backup-postgres.sh` should print `uploaded
s3://hireforge/...`; then `./scripts/deploy/restore-check.sh` restores the
   newest dump **from the bucket**. Or just say "bucket done".

### 1b. Staging (code ready, needs DNS and memory)

`compose.staging.yml`, `deploy/.env.staging` (already generated on the VM)
and `ship.sh staging` are in place; see `docs/deployment/hetzner.md` §10.
Not started yet because the VM has ~1 GB free and no swap (item 2):
staging can use up to ~1.2 GB.

1. DNS at the registrar: `A` record `staging` → `178.105.128.190`.
2. Item 2 (Docker restart + swap).
3. Say "staging go": `staging-init.sh` adds the Caddy site, `ship.sh staging`
   starts it. Login afterwards: `grep STAGING_BASIC_AUTH deploy/.env.staging`
   on the VM.

### 2. The production VM is too small to build on (optional now)

3.8 GB RAM, no swap. On 2026-10-28 a deploy that built images on the VM
starved it and sljakam.com was unreachable for ~18 minutes (03:16–03:34).
On 2026-10-29 "used" memory was still ~2.8 GB with the app using ~450 MB:
the Docker daemon itself held ~1.8 GB after loading the old 4.5 GB images
many times. Images are now small and pruned (`ship.sh`); a `sudo systemctl
restart docker` (≈30 s downtime, containers come back) would free that
memory, and swap remains the real safety net.
Deploys now build images off the VM and ship them, so this is a safety net,
not a blocker.

Adding swap needs `sudo`, which asks for the **`deploy` user's Linux
password** — not an SSH password (SSH logs in with the key
`~/.ssh/hetzner_hireforge`, no password). It was set when the server was
created (`adduser deploy`). If you don't have it:

1. Hetzner Cloud Console → the server → **Rescue** → **Reset root password**
   (shows a new root password once).
2. Open the server's web **Console** in Hetzner (root SSH login is disabled if
   the runbook's SSH hardening was applied), log in as `root` with that password.
3. Either set a new password for deploy — `passwd deploy` — and store it in
   your password manager, or run the swap commands right there as root
   (without `sudo`):

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -m   # Swap: 4095 total
```

Alternatively resize to a larger Hetzner plan (no password needed, short
reboot), or let CI build images (needs a GHCR read token on the server).

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

- [ ] **Featured-only visibility: revisit after the first month** (decided
      2026-10-28, live with #20). Only featured jobs are indexed, in the
      sitemap and announced to search engines; the rest are locked teasers.
      Today prod has no featured job, so the sitemap lists static pages only.
      If search traffic stays near zero, the alternative is: every job page
      public and indexed, apply and contact details behind sign-in, featured
      jobs get placement, a badge and the faster indexing pings.
      `PUBLIC_JOBS=false` still walls everything.

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

  The last line prints the key back when it works. Only featured jobs are
  announced.

- [ ] **Analytics**: none is installed (by design in this branch). Choose GA4
      (needs the cookie consent banner) or a cookieless tool (Plausible,
      Umami, Cloudflare Web Analytics: no banner needed).

- [ ] **Archive the seed sample job on prod**: "Senior TypeScript developer"
      (DEVLEGION, `20000000-0000-4000-8000-000000000001`, from
      `scripts/db/seed-domain-baseline.sql`). Since #20 it is non-featured:
      a locked teaser, out of the sitemap, no JobPosting markup, so it no
      longer risks Google's job-posting rules, but guests still see a fake
      ad in the list. Archive it from the moderator/admin UI (or say so and
      it gets archived).
