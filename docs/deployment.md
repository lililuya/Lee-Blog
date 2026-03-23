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

This keeps deployment simple while still supporting:

- public publishing
- admin workflows
- guest-comment moderation
- scheduled paper and digest jobs
- SMTP-based email flows
- AI and RAG integrations

## 2. Environment groups

### 2.1 Core runtime

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

### 2.2 Admin auth and security

Common security-related values:

- `SESSION_SECRET`
- mail variables used for admin verification and password reset
- optional 2FA naming values

### 2.3 Email delivery

If you want the full security and moderation loop, configure SMTP values in `.env`.

Typical email use cases now are:

- admin verification
- password reset
- guest comment review / reply notifications
- admin moderation notifications
- optional new-post notifications for the private admin account

Recommended validation steps:

1. test admin verification or resend verification
2. test forgot password
3. submit one guest comment
4. review that comment from `/admin/comments`
5. confirm at least one moderation or reply email path

### 2.4 AI and RAG

Depending on which providers you enable, configure:

- provider API keys for chat models
- transcription provider credentials
- embedding provider settings for RAG

After major content changes, run:

```bash
npm run rag:sync
```

## 3. Local development

### 3.1 Node.js workflow

```bash
npm ci
npm run db:push
npm run db:bootstrap
npm run db:seed:demo
npm run dev
```

`npm run db:bootstrap` is the safe default for new databases. Use `npm run db:seed:demo` only when you explicitly want local sample content.

### 3.2 Docker Compose workflow

```bash
docker compose up -d db
docker compose up -d app
docker compose run --rm app npm run db:push
docker compose run --rm app npm run db:bootstrap
docker compose run --rm app npm run db:seed:demo
```

## 4. First deployment checklist

Recommended order:

1. prepare server and Docker
2. copy production `.env`
3. start PostgreSQL
4. build or pull the app image
5. run `npm run db:push`
6. run `npm run db:bootstrap`
7. start the app container
8. verify admin login, guest comments, and mail delivery
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

### 5.1 Typical commands

```bash
npm run papers:sync
npm run digest:generate
npm run rag:sync
```

## 6. Operational checks after deploy

After every release, validate:

- homepage renders
- `/register` shows the registration-closed message
- admin login and logout work
- admin dashboard opens
- one blog detail page renders its comment section
- a guest comment can be submitted
- `/admin/comments` can review that comment
- `/tools` opens and can validate provider requests
- `/account/notifications` loads for the admin account if you use the private inbox
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
