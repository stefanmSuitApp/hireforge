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
docker compose -f compose.prod.yml --profile tools run --rm migrate pnpm db:seed:rs
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

Check public routes:

```bash
curl -I https://sljakam.com
curl -fsS https://sljakam.com/api/integration
```

Then smoke test:

- Candidate registration/login.
- Employer registration/login and one authenticated employer action.
- Moderator/admin login.
- One worker-backed flow where safe, such as billing/outbox processing.
- Billing PDF write/read if Object Storage credentials are configured.

## 8. Backups

Create a manual Postgres backup:

```bash
./scripts/deploy/backup-postgres.sh
```

Backups are written to `./backups/postgres` by default. Copy them off the VM to Hetzner Object Storage or another external backup target.

Also back up Docker volumes:

- `hireforge-production_postgres_data`
- `hireforge-production_redis_data`
- `hireforge-production_api_var` if local file storage is used
- Caddy data/config if you want to preserve ACME cert state

## 9. Updating Production

```bash
cd /opt/hireforge
git pull --ff-only
./scripts/deploy/deploy-hetzner.sh
```

For emergency rollback, check out the previous known-good commit and rerun the deploy script. Database migrations may not be reversible, so take a backup before deploying schema changes.
