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
`HIREFORGE_BACKUP_KEEP_DAYS`). They live on the same disk as the database:
**copy them off the VM** (Hetzner Storage Box / Object Storage) — see
`NEEDS_STEFAN.md`.

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

**Do not build images on the VM.** It has 3.8 GB RAM and no swap; building
web/api/worker there starved the machine and took sljakam.com offline for
~18 minutes on 2026-10-28. Images are built on a Mac (OrbStack/Docker
Desktop) and shipped. From a clean checkout of a commit that is on
`origin/main`:

```bash
./scripts/deploy/ship.sh
```

`ship.sh` (build machine) builds `hireforge-production-{api,worker,web}:<sha>`
for `linux/amd64`, sends the server only the images it lacks, fast-forwards
`/opt/hireforge` to that commit and runs `scripts/deploy/release.sh <sha>`
there, which:

1. backs up Postgres (`backups/postgres/`);
2. runs the migrations with the new api image (one transaction; on failure
   nothing has been restarted);
3. retags `<sha>` → `:latest`, `docker compose up --wait`, then gates: all
   containers healthy, the worker logged `worker_started`, `/sr` answers
   through Caddy. **Any failure restores the previous images** and exits
   non-zero;
4. records the release in `backups/releases.log` and removes images of all
   but the **last 3 releases** (so the disk doesn't fill up again: before
   this, every deploy left ~14 GB of images behind).

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
./scripts/deploy/release.sh <previous-sha>        # or "legacy": the pre-script images
```

Migrations are forward-only: an older release runs against the newer
schema; restore a dump if a schema change must be undone.

After every deploy, from the build machine (report only, never blocks):

```bash
pnpm seo:audit https://sljakam.com   # robots, sitemaps, canonical/hreflang, JSON-LD, www → apex
pnpm lighthouse https://sljakam.com  # scores vs scripts/perf-budgets.json; HTML in dist/lighthouse/
```

or re-run the "quality report" GitHub workflow by hand.

Rollback: before shipping, record the running image ids
(`docker inspect --format '{{.Image}}' hireforge-production-api-1`, same for
`worker` / `web`), then `docker tag <id> hireforge-production-<svc>:latest`
and `up -d --no-build`. Migrations are forward-only: restore a dump if a
schema change must be undone.

`./scripts/deploy/deploy-hetzner.sh` still builds on the VM (sequentially);
use it only after adding swap or resizing the server, and prefer `ship.sh`.
