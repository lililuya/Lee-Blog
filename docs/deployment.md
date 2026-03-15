# Deployment Guide

This guide documents the current deployment and operations model for Scholar Blog Studio.

## 1. Recommended production topology

A practical production setup is:

- one Linux server or VM
- Docker Engine + Docker Compose
- PostgreSQL
- Nginx or Caddy as reverse proxy
- GitHub Actions for CI/CD and scheduled jobs
- optional GHCR image registry

This keeps the deployment simple while still supporting:

- admin workflows
- scheduled paper and digest jobs
- SMTP-based email flows
- AI/RAG integrations

## 2. Environment groups

## 2.1 Core runtime

Required baseline values:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 2.2 Account and security

Common security-related values:

- `SESSION_SECRET`
- mail variables used for verification/reset delivery
- optional 2FA-related app naming values

## 2.3 Email delivery

If you want email verification, password reset, comment lifecycle mail, or publish notifications, configure SMTP values in `.env`.

Recommended validation steps:

1. test registration
2. test resend verification
3. test forgot password
4. test one comment moderation notification

## 2.4 AI and RAG

Depending on which providers you enable, configure:

- provider API keys for chat models
- transcription provider credentials
- embedding provider settings for RAG

After major content changes, run:

```bash
npm run rag:sync
```

## 3. Local development

## 3.1 Node.js workflow

```bash
npm ci
npm run db:push
npm run db:seed
npm run dev
```

## 3.2 Docker Compose workflow

```bash
docker compose up -d db
docker compose up -d app
docker compose run --rm app npm run db:push
docker compose run --rm app npm run db:seed
```

## 4. First deployment checklist

Recommended order:

1. prepare server and Docker
2. copy production `.env`
3. start PostgreSQL
4. build or pull the app image
5. run `npm run db:push`
6. run `npm run db:seed`
7. start the app container
8. verify login, admin pages, and mail delivery
9. verify scheduled jobs

## 5. Scheduled jobs

The project currently expects these recurring tasks:

- daily paper sync
- weekly digest generation
- optional regular RAG sync after heavy content updates

These can run via:

- GitHub Actions
- server cron
- any other scheduler in your infrastructure

## 5.1 Typical commands

```bash
npm run papers:sync
npm run digest:generate
npm run rag:sync
```

## 6. Operational checks after deploy

After every release, validate:

- homepage renders
- login and logout work
- admin dashboard opens
- post detail page renders comments
- `/tools` opens and can validate provider requests
- `/account/notifications` loads for signed-in users
- one analytics visit is recorded

## 7. Backup recommendations

At minimum, back up:

- PostgreSQL database
- `.env`
- uploaded files under `public/uploads`

If the site becomes important to your workflow, add:

- scheduled database dumps
- off-machine backup storage
- basic alerting for failed scheduled jobs

## 8. Related docs

- [feature-overview.md](./feature-overview.md)
- [routes-and-apis.md](./routes-and-apis.md)
- [deployment-alicloud.zh-CN.md](./deployment-alicloud.zh-CN.md)
