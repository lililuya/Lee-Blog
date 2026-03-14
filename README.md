# Scholar Blog Studio

A self-managed full-stack academic blog and research workspace built with `Next.js + TypeScript + Prisma + PostgreSQL`.

It is designed for long-term personal publishing, evergreen notes, research tracking, reader interaction, and future AI tool expansion, while still being easy for one person to deploy and operate.

## Implemented modules

- academic-style homepage and personal profile
- long-form blog posts
- journal / lab notes
- evergreen notes (`/notes`)
- Markdown content sync workflow
- login, registration, and database-backed sessions
- comment submission and moderation
- admin dashboard and content management
- user management with role control, mute, suspension, soft delete, and session revocation
- daily arXiv paper sync by topic
- personal paper library, reading status, and annotations
- weekly digest generation
- site-wide search
- RSS and JSON Feed output
- floating multi-LLM chat entry
- reserved `/tools` module for future AI services
- Docker deployment and GitHub Actions CI/CD
- dark mode and reading-page chat offset behavior

## Architecture choice

This project uses an integrated full-stack architecture rather than a traditional frontend/backend split.

That means:

- public pages, admin pages, auth, database access, and server logic live in one repository
- Next.js App Router handles both UI rendering and server-side logic
- Prisma provides a single typed data layer for the whole product
- Zod validators, auth rules, and business logic are shared instead of duplicated across two codebases

For a self-managed blog with admin workflows, comments, scheduled tasks, and AI integrations, this is usually easier to maintain than running a separate SPA plus API service.

More detail:

- [docs/architecture.md](./docs/architecture.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/deployment-alicloud.zh-CN.md](./docs/deployment-alicloud.zh-CN.md)

## Tech stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Prisma
- PostgreSQL
- custom session auth with HttpOnly cookie
- Docker / Docker Compose
- GitHub Actions

## Quick start

1. Copy `.env.example` to `.env`
2. Fill in your database and app settings
3. Install dependencies:
   `npm ci`
4. Push the Prisma schema:
   `npm run db:push`
5. Seed the default accounts and demo content:
   `npm run db:seed`
6. Start the dev server:
   `npm run dev`

## Useful routes

Public routes:

- `/`
- `/blog`
- `/blog/[slug]`
- `/journal`
- `/notes`
- `/notes/[slug]`
- `/papers`
- `/papers/library`
- `/digest`
- `/digest/[slug]`
- `/search`
- `/tools`
- `/login`
- `/register`
- `/feed.xml`
- `/feed.json`

Admin routes:

- `/admin`
- `/admin/posts`
- `/admin/journal`
- `/admin/notes`
- `/admin/papers`
- `/admin/digests`
- `/admin/comments`
- `/admin/users`
- `/admin/audit`
- `/admin/profile`
- `/admin/providers`

A detailed route and interface reference is available here:

- [docs/routes-and-apis.md](./docs/routes-and-apis.md)
- [docs/routes-and-apis.zh-CN.md](./docs/routes-and-apis.zh-CN.md)
- [docs/papers-operations.zh-CN.md](./docs/papers-operations.zh-CN.md)

## Login notes

Database credentials and website login credentials are different things.

Database:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`

Website accounts:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Default seeded accounts:

- admin: `admin@example.com` / `ChangeMe123!`
- reader: `reader@example.com` / `ReaderDemo123!`

If you change seeded account credentials in `.env`, run:

```bash
npm run db:seed
```

The seed script also restores the default admin and demo reader to active status, which is useful if you suspend or soft-delete them during testing.

## Markdown content workflow

Content directories:

- `content/blog`
- `content/notes`
- `content/journal`

Available commands:

- `npm run content:sync`: one-time import from Markdown into PostgreSQL
- `npm run content:watch`: watch Markdown files and auto-sync on change

Notes now support two management paths:

- Markdown-first workflow via `content/notes`
- in-browser CRUD via `/admin/notes`

Detailed docs:

- [docs/notes-sync.md](./docs/notes-sync.md)
- [docs/notes-sync.zh-CN.md](./docs/notes-sync.zh-CN.md)
- [content/README.md](./content/README.md)

## Common commands

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:studio`
- `npm run papers:sync`
- `npm run digest:generate`
- `npm run content:sync`
- `npm run content:watch`

## Daily papers

- public page: `/papers`
- admin page: `/admin/papers`
- user library: `/papers/library`
- data source: arXiv API
- manual sync: `npm run papers:sync`
- recommended schedule: every day at 08:00 Asia/Shanghai
- operations guide: [docs/papers-operations.md](./docs/papers-operations.md) / [docs/papers-operations.zh-CN.md](./docs/papers-operations.zh-CN.md)

## Weekly digests

- public page: `/digest`
- admin page: `/admin/digests`
- manual generation: `npm run digest:generate`
- recommended schedule: every Monday at 08:00 Asia/Shanghai

The digest summarizes the previous complete local week, so papers synced today may not appear in the newest digest if they fall outside that weekly window.

## User management

Admins can manage users from `/admin/users`.

Implemented controls:

- promote a reader to admin
- demote an admin to reader
- mute a user from commenting for a configurable number of days
- remove an existing mute
- suspend sign-in access
- soft-delete a user account
- restore suspended or deleted accounts
- revoke all active sessions for a user

Safety rules:

- the current admin cannot delete, suspend, mute, demote, or revoke themselves
- the system blocks destructive changes to the last active admin account
- suspension and soft deletion revoke active sessions immediately

## Chat and providers

The floating chat widget is login-gated.

To make a provider usable:

1. Add its API key to `.env`
2. Configure the provider in `/admin/providers`
3. Ensure the provider is enabled

The frontend only shows providers that are both enabled and have a non-empty environment variable.

## CI/CD and scheduled jobs

Included workflows:

- `ci.yml`: install, db push, seed, lint, build
- `deploy.yml`: build and deploy the Docker image over SSH
- `daily-papers.yml`: scheduled arXiv sync
- `weekly-digest.yml`: scheduled digest generation

Deployment details:

- [docs/deployment.md](./docs/deployment.md)
- [docs/deployment-alicloud.zh-CN.md](./docs/deployment-alicloud.zh-CN.md)

## Documentation index

English:

- [docs/architecture.md](./docs/architecture.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/notes-sync.md](./docs/notes-sync.md)
- [docs/routes-and-apis.md](./docs/routes-and-apis.md)
- [docs/papers-operations.md](./docs/papers-operations.md)
- [content/README.md](./content/README.md)

Chinese:

- [docs/deployment-alicloud.zh-CN.md](./docs/deployment-alicloud.zh-CN.md)
- [docs/tech-stack-and-learning.zh-CN.md](./docs/tech-stack-and-learning.zh-CN.md)
- [docs/content-update-workflow.zh-CN.md](./docs/content-update-workflow.zh-CN.md)
- [docs/notes-sync.zh-CN.md](./docs/notes-sync.zh-CN.md)
- [docs/routes-and-apis.zh-CN.md](./docs/routes-and-apis.zh-CN.md)
- [docs/papers-operations.zh-CN.md](./docs/papers-operations.zh-CN.md)

## Recommended next steps

If you want to continue evolving this into a stronger research workspace, the best next additions are:

- newsletter / email subscription delivery
- image upload with object storage
- topic archive pages and tag navigation
- observability with Sentry or OpenTelemetry
- automated database backup and alerts
- richer AI tools inside `/tools`








