# Architecture

This document describes the current architecture of Scholar Blog Studio as of the latest integrated blog + research workspace build.

## 1. Product shape

The project uses a single-repository integrated full-stack architecture.

That means:

- public pages, admin pages, APIs, and server actions live in one Next.js application
- Prisma provides one typed data layer for all product modules
- business rules, validation, and permission checks are shared instead of duplicated
- the app can evolve from a simple blog into a research workspace without splitting stacks too early

This architecture is a good fit because the product already combines:

- content publishing
- account lifecycle and moderation
- research paper ingestion
- scheduled jobs
- AI/RAG features
- internal admin tooling

## 2. Runtime layers

### Presentation layer

Implemented with:

- Next.js App Router pages and layouts
- React Server Components for data-heavy pages
- client components for interactive widgets, forms, and chat
- Tailwind CSS for styling

Primary directories:

- `app/`
- `components/`

### Application layer

Implemented with:

- server actions in `lib/actions/*`
- query helpers in `lib/queries.ts` and related modules
- domain-specific services such as auth, moderation, notifications, and RAG helpers

Primary directories:

- `lib/actions/`
- `lib/`

### Data layer

Implemented with:

- Prisma schema in `prisma/schema.prisma`
- PostgreSQL as the main runtime database
- seeded demo/admin data in `prisma/seed.ts`

### Integration layer

Implemented with:

- route handlers in `app/api/*`
- email delivery via Nodemailer
- arXiv sync scripts
- external LLM and transcription provider adapters

## 3. Main bounded contexts

The repository now contains several clear product domains.

### Publishing and content

- blog posts
- notes
- journal entries
- content series
- tags and categories
- archives and related-post recommendations
- revision history and scheduled publishing

### Accounts, security, and moderation

- registration and login
- email verification
- forgot/reset/change password
- custom session management
- admin-only 2FA
- login rate limiting and unusual login alerts
- user role/status management
- comment moderation, anti-spam, and rule management
- in-app and email notifications

### Research workspace

- paper topics and daily arXiv sync
- personal paper library
- paper annotations and progress tracking
- weekly digest generation
- citation and BibTeX export
- backlinks from notes into other content

### AI and RAG

- provider registry for chat models
- configurable transcription providers
- API validation lab under `/tools`
- floating site chat
- hybrid RAG with manual knowledge sync
- admin RAG console and sync status view

### Operations

- audit logs
- export endpoints
- analytics dashboard
- deployment scripts and GitHub Actions workflows

## 4. Request and write flows

### Read flow

1. A route in `app/` renders on the server.
2. It calls query helpers from `lib/queries.ts` or related modules.
3. Prisma fetches data from PostgreSQL.
4. The page renders directly with typed data.

### Write flow

1. A form submits to a server action or API route.
2. Zod validates the input.
3. The application layer applies permission and business rules.
4. Prisma writes to PostgreSQL.
5. `revalidatePath()` refreshes affected pages.
6. The user is redirected or receives a structured API response.

### Background flow

Scheduled or manual jobs run through scripts such as:

- `npm run papers:sync`
- `npm run digest:generate`
- `npm run content:sync`
- `npm run rag:sync`

These jobs update the database so the public site and admin tools stay in sync.

## 5. Security model

The project currently uses:

- database-backed sessions stored in an HttpOnly cookie
- role checks (`ADMIN`, `READER`)
- status checks (`ACTIVE`, `SUSPENDED`, `DELETED`)
- admin route protection
- email verification gates for comment participation
- comment anti-spam rules
- rate limiting on sensitive auth flows
- admin-only 2FA
- audit logs for privileged actions

This is intentionally stronger than a typical personal blog because the product now includes provider keys, exports, and moderation workflows.

## 6. Extensibility

The architecture deliberately leaves room for further expansion without major rewrites.

Current extension points include:

- adding new provider adapters
- extending the `/tools` area with more AI utilities
- expanding the RAG knowledge model
- adding more exports and analytics reports
- introducing object storage or richer media pipelines

## 7. Recommended reading order

If you are onboarding to the codebase, read these next:

1. [feature-overview.md](./feature-overview.md)
2. [routes-and-apis.md](./routes-and-apis.md)
3. [deployment.md](./deployment.md)
4. [rag-v2.md](./rag-v2.md)
