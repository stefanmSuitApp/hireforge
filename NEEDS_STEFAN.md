# Needs Stefan

Things Claude could not (or must not) do alone. Newest first within each
priority. Remove an item when it is done. **No secrets in this file.**

## 🔴 Urgent

### 1. Rotate the seed passwords on production (security)

Prod contains the dev seed accounts, and they still use the shared seed
password printed in `scripts/db/seed-domain-baseline.sql`:
`admin@hireforge.local` (admin), `moderator@hireforge.local`,
`employer@hireforge.local`, `candidate@hireforge.local`, and your own
`maticstefan1996@gmail.com`. Anyone who has seen the repo can sign in as
admin on sljakam.com.

Claude generated new random passwords and prepared hash-only SQL, but
changing credentials on prod was blocked by the permission check.

- New passwords: `~/hireforge-prod-credentials-2026-10-28.txt` (your Mac,
  `chmod 600`, not in the repo). **Not active until you run the command
  below.**
- Apply (sends bcrypt hashes only):

  ```bash
  ssh -i ~/.ssh/hetzner_hireforge deploy@178.105.128.190 'cd /opt/hireforge && docker compose -f compose.prod.yml exec -T postgres sh -c "psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\""' < ~/hireforge-rotate-seed-passwords-2026-10-28.sql
  ```

  Expect `5` (rows rotated) at the end. Then store the passwords in your
  password manager and delete the three `~/hireforge-*-2026-10-28.*` files.

- Existing sessions survive a password change made by SQL. Since Phase C
  you can revoke them too — run this right after the rotation:

  ```bash
  ssh -i ~/.ssh/hetzner_hireforge deploy@178.105.128.190 'cd /opt/hireforge && docker compose -f compose.prod.yml exec -T postgres sh -c "psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\""' < ~/hireforge-revoke-sessions-2026-10-28.sql
  ```

  Expect `UPDATE 5`. Consider deleting the `@hireforge.local` accounts you
  do not need once you have a real admin account.

### 2. Confirm `sljakam.com` is a verified domain in Resend

Verification, password-reset and notification emails go out through Resend
from `noreply@sljakam.com`. The prod key is send-only, so Claude could not
check domain status. If SPF/DKIM are not verified, **no auth email
arrives and no new candidate can apply** (applying needs a verified email).
Check: Resend dashboard → Domains → `sljakam.com` → Verified.

## 🟠 Soon

### 3. The production VM is too small to build on

3.8 GB RAM, no swap. On 2026-10-28 a deploy that built images on the VM
starved it and sljakam.com was unreachable for ~18 minutes (03:16–03:34).
Deploys now build images on the Mac and ship them (`docker save | ssh
docker load`). To make the VM safer, add swap (needs your sudo password):

```bash
ssh deploy@178.105.128.190
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Optionally resize to a larger Hetzner plan, or let CI build images (needs
a GHCR read token on the server — your call).

### 4. Turn on nightly backups, then copy them off the VM

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

### 5. Sentry

Create a Sentry project (or say which error tracker you want) and put the
DSN in `deploy/.env.production` as `SENTRY_DSN`; wiring is Phase D.

### 6. Accountant: VAT status and invoice content (Phase D)

The billing design assumes no VAT and in-house numbered PDFs. Confirm with
an accountant: is the legal entity in the VAT system, does B2B invoicing
need SEF (eFaktura), and which fields the invoice must carry (seller/buyer
PIB, MB, address, line items, date of supply). Code has `TODO(Stefan)`
markers where this matters.

### 7. Legal texts

Privacy policy, terms of use and refund policy pages need real legal copy
(Serbian + English). The pages and footer links are Phase D; send the texts
(or publish them as Sanity editorial pages) and they can go live.

## 🟡 Decide when convenient

### 8. SEO branch

A separate session is preparing `feat/seo-quality-gates` (clone at
`~/Dev/DEVLEGION/hireforge-seo`) that makes job list/detail public behind
`PUBLIC_JOBS`. Claude's phases do not touch SEO to avoid conflicts; merge
it when you are ready.
