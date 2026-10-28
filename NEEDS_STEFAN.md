# Needs Stefan

Things Claude could not (or must not) do alone. Newest first within each
priority. Remove an item when it is done. **No secrets in this file.**

## ✅ Done

- **Seed passwords rotated** on production (2026-10-28) and the five
  accounts' sessions revoked; verified: no account uses the seed password,
  the old admin password is rejected on the live site. New passwords are in
  `~/hireforge-prod-credentials-2026-10-28.txt` on Stefan's Mac (kept on
  purpose, outside the repo — never commit it).
- **Resend domain** `sljakam.com` confirmed verified.

## 🟠 Soon

### 1. Turn on nightly backups, then copy them off the VM

The only Postgres dumps on the server are the ones taken by hand during
deploys. Installing the nightly job was blocked by the permission check
(adds a cron entry). It needs no sudo — run once:

```bash
ssh -i ~/.ssh/hetzner_hireforge deploy@178.105.128.190 'cd /opt/hireforge && ./scripts/deploy/install-backup-cron.sh'
```

It runs `backup-postgres.sh` at 02:17 server time and keeps 14 days. The
dumps sit on the same disk as the database: create a Hetzner Storage Box or
Object Storage bucket and put its credentials in `deploy/.env.production`
(not chat) so dumps can be copied off the machine.

### 2. The production VM is too small to build on (optional now)

3.8 GB RAM, no swap. On 2026-10-28 a deploy that built images on the VM
starved it and sljakam.com was unreachable for ~18 minutes (03:16–03:34).
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

### 6. SEO branch

A separate session is preparing `feat/seo-quality-gates` (clone at
`~/Dev/DEVLEGION/hireforge-seo`) that makes job list/detail public behind
`PUBLIC_JOBS`. Claude's phases do not touch SEO to avoid conflicts; merge
it when you are ready.

## SEO branch: decisions

The full to-do list for search and reach, ordered by impact:
`docs/plans/SEO_REACH_CHECKLIST.md`.

- [ ] **Confirm or flip `PUBLIC_JOBS`** (SEO branch, 2026-10-28). Job list,
      job detail and the employers pages are now public so search engines can
      index them; apply and save still need login. This reverses the
      2026-10-27 "jobs behind login" decision, as discussed at handoff.
      To go back: `PUBLIC_JOBS=false` in `deploy/.env.production` and restart
      `web` and `api` (no rebuild). That also turns off job sitemaps,
      JobPosting JSON-LD and indexing pings.

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
- [ ] **Search engine verification codes** (Search Console, Bing Webmaster
      Tools, Yandex Webmaster): add the site, choose the HTML meta tag method,
      and put each code in `deploy/.env.production` as
      `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`,
      `YANDEX_SITE_VERIFICATION`; restart `web`. Then submit
      `https://sljakam.com/sitemap.xml` in each.
- [ ] **Google Indexing API**: in Google Cloud create a service account,
      enable the "Web Search Indexing API", download its JSON key, add the
      account's email as an **Owner** of sljakam.com in Search Console, and
      put the key base64-encoded (`base64 -i key.json`) in
      `deploy/.env.production` as `GOOGLE_INDEXING_SA_JSON`; restart
      `worker`. Not in chat.
- [ ] **`INDEXNOW_KEY`**: any 32 hex chars work (e.g. `openssl rand -hex 16`);
      set it in `deploy/.env.production` and restart `web` and `worker`.
      Not secret (it is served publicly at `/<key>.txt`).
- [ ] **Analytics**: none is installed (by design in this branch). Choose GA4
      (needs the cookie consent banner) or a cookieless tool (Plausible,
      Umami, Cloudflare Web Analytics: no banner needed).

- [ ] **Unpublish the seed sample job on prod** before submitting the
      sitemap: "Senior TypeScript developer" (DEVLEGION,
      `20000000-0000-4000-8000-000000000001`, from
      `scripts/db/seed-domain-baseline.sql`) is the only live job, and since
      the SEO deploy it is public, in `jobs-0.xml` and carries JobPosting
      markup. Archive it from the moderator/admin UI (or say so and it gets
      archived).
