# Hetzner Production Deployment

This runbook deploys Šljakam from this repository to a single Hetzner Cloud VM with Docker Compose.

The public domain is `https://sljakam.com`. Caddy terminates TLS and proxies all public traffic to the Next.js web app. The Nest API is private on the Docker network as `http://api:4000`; do not route public `/api/*` directly to Nest because the Next app owns many `/api` BFF routes.

## 1. Create The Server

Recommended first production shape:

- Ubuntu 24.04 LTS.
- Start with CX32 or CPX31, then resize based on load.
- Add your SSH key in Hetzner Cloud.
- Enable backups or snapshots for the VM, but still keep Postgres dumps.

Create a non-root deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Harden SSH in `/etc/ssh/sshd_config`:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Then reload SSH:

```bash
systemctl reload ssh
```

Enable firewall and security updates:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
apt-get update
apt-get install -y unattended-upgrades ca-certificates curl gnupg
dpkg-reconfigure -plow unattended-upgrades
```

## 2. Install Docker

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker deploy
```

Log out and back in as `deploy` so the Docker group applies.

## 3. Configure DNS

Point these records to the server IP:

- `A sljakam.com -> <server-ip>`
- `A www.sljakam.com -> <server-ip>`
- Optional `AAAA` records if the server has IPv6.

Wait until DNS resolves before starting Caddy so ACME certificate issuance succeeds.

## 4. Prepare The App

Clone the repository:

```bash
sudo mkdir -p /opt/hireforge
sudo chown deploy:deploy /opt/hireforge
git clone <repo-url> /opt/hireforge
cd /opt/hireforge
```

Create the production env file:

```bash
cp deploy/env.production.example deploy/.env.production
chmod 600 deploy/.env.production
```

Edit `deploy/.env.production` and replace every secret placeholder.

Important values:

- `NEXT_PUBLIC_APP_URL=https://sljakam.com`
- `NEXT_PUBLIC_API_URL=http://api:4000`
- `NEST_API_URL=http://api:4000`
- `DATABASE_URL=postgresql://hireforge:<url-encoded-password>@postgres:5432/hireforge`
- `REDIS_URL=redis://:<url-encoded-password>@redis:6379`
- `AUTH_DEV_HEADERS=0`
- strong `AUTH_JWT_SECRET`, `CMS_SYNC_SECRET`, and `SANITY_WEBHOOK_SECRET`

If a password contains `@`, `#`, `:`, `/`, or other URL-special characters, URL-encode it in `DATABASE_URL` and `REDIS_URL`.

## 5. Build And Start

The deploy script exports the env file before Compose runs so the web image receives the same `NEXT_PUBLIC_*` values during `next build`:

```bash
./scripts/deploy/deploy-hetzner.sh
```

Manual equivalent:

```bash
set -a
. ./deploy/.env.production
set +a
docker compose -f compose.prod.yml up -d --build
docker compose -f compose.prod.yml --profile tools run --rm migrate
docker compose -f compose.prod.yml ps
```

Production-safe seed data:

```bash
docker compose -f compose.prod.yml --profile tools run --rm migrate node scripts/db/seed-rs-locations.mjs
```

Do not run `pnpm db:seed:domain` in production unless you intentionally want the development users and sample company/job.

## 6. Sanity And Object Storage

Configure the Sanity publish webhook:

```text
POST https://sljakam.com/api/revalidate/sanity?secret=<SANITY_WEBHOOK_SECRET>
```

For billing PDFs on Hetzner Object Storage, set:

- `S3_BILLING_BUCKET`
- `S3_ENDPOINT`
- `S3_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Local fallback files are stored in the Docker volume mounted at `/app/var`; include this volume in backup planning if any local storage remains enabled.

## 7. Verify The Deploy

Check containers:

```bash
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs --tail=100 api
docker compose -f compose.prod.yml logs --tail=100 web
docker compose -f compose.prod.yml logs --tail=100 worker
```

Check public routes and the private integration probe (the web `/api/integration`
route is dev-only and returns 404 in production):

```bash
curl -I https://sljakam.com
curl -o /dev/null -w '%{http_code}\n' https://sljakam.com/api/integration   # expect 404
docker compose -f compose.prod.yml exec api node -e "fetch('http://127.0.0.1:4000/api/integration').then(r=>r.text()).then(console.log)"
```

The API refuses to boot in production when `AUTH_DEV_HEADERS=1` or when
`AUTH_JWT_SECRET` / `CMS_SYNC_SECRET` / `SANITY_WEBHOOK_SECRET` still hold a
placeholder (`replace-with…`) or are shorter than 32 characters. Check
`docker compose -f compose.prod.yml logs api` if the api container restarts.

Then smoke test:

- Candidate registration/login.
- Employer registration/login and one authenticated employer action.
- Moderator/admin login.
- One worker-backed flow where safe, such as billing/outbox processing.
- Billing PDF write/read if Object Storage credentials are configured.

## 8. Backups

Nightly backups (02:17 server time, keeps 14 days, refuses empty dumps) —
install once as the `deploy` user, no sudo needed:

```bash
cd /opt/hireforge && ./scripts/deploy/install-backup-cron.sh
```

Manual backup at any time: `./scripts/deploy/backup-postgres.sh`. Dumps go
to `./backups/postgres` (override with `HIREFORGE_BACKUP_DIR`, retention with
`HIREFORGE_BACKUP_KEEP_DAYS`), and every deploy takes one first.

**Off-server copies.** With `S3_BACKUP_BUCKET` (plus `S3_ENDPOINT`,
`S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) in
`deploy/.env.production`, each dump is also uploaded to
`s3://<bucket>/<S3_BACKUP_PREFIX>` and checked by size; the bucket keeps
`S3_BACKUP_KEEP_DAYS` (30) days. The upload runs with the api image
(`scripts/db/backup-offsite.mjs`). If it fails the local dump stays, the
script exits 3 and the cron log (`backups/backup-cron.log`) says
`OFF-SERVER UPLOAD FAILED`; a deploy warns and carries on. The bucket is
`hireforge` (DEVLEGION project, nbg1, private): production's dumps under
`backups/postgres/production/`, staging's (one per staging release) under
`backups/postgres/staging/`.

**Rotating the bucket keys** (Hetzner keys reach every bucket in the
DEVLEGION project): Hetzner Console → Object Storage → Manage credentials →
Generate; on the server replace `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY` in `deploy/.env.production`; run
`./scripts/deploy/backup-postgres.sh` (must print `uploaded s3://…`); delete
the old credentials in Hetzner. Staging picks the new keys up on its next
release (`staging-init.sh --env-only`). No restart needed.

**Restore check** (safe on production; restores into a throwaway database,
compares it with the live one, drops it):

```bash
./scripts/deploy/restore-check.sh                       # newest dump in the bucket
./scripts/deploy/restore-check.sh backups/postgres/<file>.sql.gz
```

Restore (destroys current data; take a fresh dump first):

```bash
gunzip -c backups/postgres/<file>.sql.gz | docker compose -f compose.prod.yml exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Also back up Docker volumes:

- `hireforge-production_postgres_data`
- `hireforge-production_redis_data`
- `hireforge-production_api_var` if local file storage is used
- Caddy data/config if you want to preserve ACME cert state

## 9. Updating Production

**Do not build images on the VM** (3.8 GB RAM: building there took
sljakam.com offline for ~18 minutes on 2026-10-28). Images are built on a
GitHub runner (or a Mac) and shipped to the server, like autofind:

1. **Merge to `main`** → the `deploy-staging` workflow runs CI (checks +
   e2e) and the integration tests, builds
   `hireforge-production-{api,worker,web}:<sha12>` once, and ships them to
   **staging** (§10). Docs-only merges don't deploy.
2. **Check https://staging.sljakam.com.**
3. **Promote**: GitHub → Actions → `deploy-production` → Run workflow →
   the commit staging ran → approve (the `production` environment needs
   Stefan's approval). It refuses a commit staging never ran; the images
   are already on the server, so production runs exactly what staging ran.

How this differs from autofind (same flow, smaller server):

- **No image registry.** The runner builds the images once and sends them
  to the server over SSH, like `ship.sh`: no registry storage bill, no
  registry login on the server.
- **Promotion.** Production uses the images staging already left on the
  server (each environment's last 3 releases are kept), so it runs exactly
  what staging ran. `deploy-production` refuses a commit staging never ran.
- **Lock.** Only one release runs on the server at a time
  (`/opt/hireforge/backups/.release.lock`): a staging deploy from CI waits
  for a production deploy, and the other way round.

Both workflows run `scripts/deploy/ship.sh` on the runner; from a Mac it is
the same path by hand (clean checkout of a commit on `origin/main`):

```bash
./scripts/deploy/ship.sh staging     # then check staging
./scripts/deploy/ship.sh             # production
```

`ship.sh` builds only images neither the server nor the build machine has,
sends the server the ones it lacks, moves the environment's checkout to that
commit (production: `/opt/hireforge`; staging: `/opt/hireforge-staging`, a
worktree of the same repository) and runs `scripts/deploy/release.sh <sha>
[staging]` there, which:

1. takes the release lock (`backups/.release.lock` in `/opt/hireforge`): one
   release at a time, whichever environment;
2. backs up Postgres (and uploads it, §8);
3. runs the migrations with the new api image (one transaction; on failure
   nothing has been restarted);
4. retags `<sha>` → `:latest` / `:staging`, `docker compose up --wait`, then
   gates: all containers healthy, the worker logged `worker_started`, `/sr`
   answers. **Any failure restores the previous images** and exits non-zero;
5. records the release in `/opt/hireforge/backups/releases.log` (staging:
   `releases-staging.log`) and removes images that are in neither
   environment's **last 3 releases**.

The workflows log in with the `DEPLOY_SSH_KEY` secret (a key only for CI,
`hireforge-github-actions-deploy` in the deploy user's `authorized_keys`)
and the `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_HOST_KEY` variables (the host
key is pinned).

Images are small: the web image is Next's `standalone` output, the api and
worker images install only the packages their build requires
(`dist/apps/*/package.json` + trimmed lockfile, written by Nx). The api
image also runs migrations (`migrate` service) and carries the production
seed `scripts/db/seed-rs-locations.mjs`; the dev seed is not in the image.

**Rollback** to one of the last 3 releases (seconds; images are on the
server):

```bash
ssh -i ~/.ssh/hetzner_hireforge deploy@<server>
cd /opt/hireforge && cat backups/releases.log   # last line is live
./scripts/deploy/release.sh <previous-sha>        # any sha in releases.log
```

Migrations are forward-only: an older release runs against the newer
schema; restore a dump if a schema change must be undone.

After every production deploy (report only, never blocks):

```bash
pnpm seo:audit https://sljakam.com   # robots, sitemaps, canonical/hreflang, JSON-LD, www → apex
pnpm lighthouse https://sljakam.com  # scores vs scripts/perf-budgets.json; HTML in dist/lighthouse/
```

or re-run the "quality report" GitHub workflow by hand.

`./scripts/deploy/deploy-hetzner.sh` still builds on the VM (sequentially);
don't use it.

## 10. Staging (staging.sljakam.com)

Staging runs on the same VM as production, like autofind: from its own
checkout `/opt/hireforge-staging`, `compose.staging.yml` (project
`hireforge-staging`) runs **the same images** as production with its own
Postgres and Redis, memory caps (~1.2 GB in all) so it can't starve
production, and no ports: production's Caddy proxies `staging.sljakam.com`
to it over the `hireforge-edge` network, behind basic auth, with
`X-Robots-Tag: noindex`. `release.sh` attaches staging's web to that
network itself, as `staging-web` only: through Compose it would also be
named `web` there, which is production's upstream (on 2026-10-29
sljakam.com served staging that way for ~40 minutes). Every release checks
that `web` in production's Caddy is production's web container. The web app takes its origin from `SITE_ORIGIN` at
runtime.

**What staging shares with production** (copied from
`/opt/hireforge/deploy/.env.production` before every staging release, so a
key rotated on production reaches staging by itself): the Sanity read token
(same CMS content), the bucket keys (dumps under `backups/postgres/staging/`)
and the Resend key, the latter **only with `EMAIL_REDIRECT_TO` set**: every
staging email then goes to that inbox, its subject naming the real
recipient (`[→ someone@firma.rs] …`); `release.sh` refuses to start staging
with a Resend key and no redirect.

**Never shared**: the login signing secret (a staging login must not work on
production), CMS sync and webhook secrets, database and Redis passwords, the
Sanity write token (empty), search-engine keys; billing runs in test mode.

**Data**: an empty staging database gets the RS locations and the dev seed.
The seed accounts are the same as production's (admin, moderator, employer,
candidate); their password hashes were copied from production on 2026-10-29,
so production logins work on staging. No real users' data is on staging.

Once (done 2026-10-29):

1. DNS: an `A` record `staging.sljakam.com` → the VM's address.
2. `/opt/hireforge-staging` (created through Docker: `/opt` is root's) and
   the first `ship.sh staging`, which adds the worktree.
3. In `/opt/hireforge-staging`:
   `STAGING_EMAIL_TO=<inbox> ./scripts/deploy/staging-init.sh` writes
   `deploy/.env.staging` (new secrets; never commit), the shared keys, and,
   once DNS resolves, the Caddy site
   `/opt/hireforge/deploy/caddy-sites/staging.caddy`. Login:
   `grep STAGING_BASIC_AUTH deploy/.env.staging`.

Rollback: `./scripts/deploy/release.sh <sha> staging` from
`/opt/hireforge-staging` (see `/opt/hireforge/backups/releases-staging.log`).
Reset staging data: `docker compose -f compose.staging.yml down -v` in
`/opt/hireforge-staging`, then run the `deploy-staging` workflow again
(fresh database and seed).
