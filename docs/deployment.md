# Deployment Guide

## 1. Recommended production topology

A practical production setup for this project is:

- 1 Linux server
- Docker Engine + Docker Compose
- PostgreSQL
- Nginx or Caddy as reverse proxy
- GitHub Actions for CI/CD and scheduled tasks
- GHCR as container registry

This setup is simple, controllable, and easy to debug.
It also leaves room for future AI service modules and scheduled jobs.

## 2. Local development

### Environment preparation

1. copy `.env.example` to `.env`
2. set `DATABASE_URL`
3. set a long `SESSION_SECRET`
4. optionally add provider API keys for chat

### Run with local Node.js

```bash
npm ci
npm run db:push
npm run db:seed
npm run dev
```

### Run with Docker Compose

```bash
docker compose up -d db
docker compose up -d app
docker compose run --rm app npm run db:push
docker compose run --rm app npm run db:seed
```

## 3. Database password vs website login password

These are different:

- `POSTGRES_PASSWORD`: PostgreSQL password
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: website admin credentials

Default seed accounts:

- admin: `admin@example.com` / `ChangeMe123!`
- reader: `reader@example.com` / `ReaderDemo123!`

If you change admin credentials in `.env`, run:

```bash
npm run db:seed
```

## 4. Required environment variables

Minimum required:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Optional:

- `CHAT_ALLOW_GUEST`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `ANTHROPIC_API_KEY`
- `APP_IMAGE`

## 5. First production deployment

Example target directory:

- `/srv/scholar-blog-studio`

Recommended first deployment steps:

1. prepare the server directory
2. upload or generate the production `.env`
3. start PostgreSQL
4. pull or build the app image
5. push the Prisma schema
6. seed the admin and base content
7. start the application container

Example commands:

```bash
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml run --rm app npm run db:push
docker compose -f docker-compose.prod.yml run --rm app npm run db:seed
docker compose -f docker-compose.prod.yml up -d app
```

## 6. Regular update flow

```bash
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml run --rm app npm run db:push
docker compose -f docker-compose.prod.yml up -d app
```

If you need to restore default admin credentials or reset seed content:

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:seed
```

## 7. GitHub Actions workflows

### `ci.yml`

Runs on push and pull request:

1. install dependencies
2. start PostgreSQL service
3. `npm run db:push`
4. `npm run db:seed`
5. `npm run lint`
6. `npm run build`

### `deploy.yml`

Runs on push to `main` or manual trigger:

1. build Docker image
2. push to GHCR
3. SSH into the server
4. write `.env`
5. pull the latest image
6. run `db:push`
7. run `db:seed`
8. restart the app

### `daily-papers.yml`

Default GitHub cron:

- `0 0 * * *`

Equivalent in Asia/Shanghai:

- every day at 08:00

Server command:

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run papers:sync
```

### `weekly-digest.yml`

Default GitHub cron:

- `0 0 * * 1`

Equivalent in Asia/Shanghai:

- every Monday at 08:00

Server command:

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run digest:generate
```

## 8. Required GitHub secrets

Minimum:

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USERNAME`
- `SSH_PRIVATE_KEY`
- `APP_ENV_FILE`
- `GHCR_PAT`

Notes:

- `APP_ENV_FILE` should contain the full production `.env`
- `GHCR_PAT` is used by the server to pull images from GHCR

## 9. Reverse proxy recommendations

Use Nginx or Caddy in front of the app container.

Make sure:

- `APP_URL` matches the real public domain
- the proxy exposes `/`, `/login`, `/blog`, `/papers`, `/digest`, `/search`, and `/admin`
- TLS is terminated correctly

## 10. Monitoring and backup recommendations

After deployment, it is strongly recommended to add:

- daily PostgreSQL backups
- disk and memory monitoring on the server
- uptime checks for `/`, `/login`, `/papers`, and `/digest`
- error tracking with Sentry or similar
- alerts for failed backups or failed scheduled jobs

## 11. Rollback strategy

Keep at least the last 3 image versions.

Rollback outline:

1. point `APP_IMAGE` back to a previous tag
2. run `docker compose -f docker-compose.prod.yml up -d app`
3. verify homepage, login, admin, papers, and digest pages
4. if the problem includes schema/data issues, restore PostgreSQL from backup before or alongside the app rollback

## 12. User management operational notes

The admin system now includes user permission management.

Important behavior:

- muting blocks comment submission only
- suspension blocks sign-in and revokes active sessions
- soft deletion blocks sign-in, revokes active sessions, and preserves linked data for audit
- running `npm run db:seed` restores the default admin and demo reader to active status

This means you have a recovery path even if an admin or reader account is accidentally suspended during testing.

## 13. Alibaba Cloud specific guide

- Chinese guide for ECS + domain + certificate deployment: `docs/deployment-alicloud.zh-CN.md`

