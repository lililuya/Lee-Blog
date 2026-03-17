# Architecture

This document describes the current architecture of Scholar Blog Studio.

## 1. Product shape

The project uses a single-repository integrated full-stack architecture.

That means:

- public pages, private admin pages, APIs, and Server Actions live in one Next.js application
- Prisma provides one typed data layer for all product modules
- business rules, validation, moderation logic, and permission checks are shared instead of duplicated
- the app can grow from a blog into a broader research workspace without splitting stacks too early

This is a good fit because the product already combines:

- public publishing
- admin identity and security
- comment moderation
- research paper ingestion and private reading workflow
- scheduled jobs
- AI and RAG features
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

- Server Actions in `lib/actions/*`
- query helpers in `lib/queries.ts` and related modules
- domain services for auth, moderation, notifications, uploads, papers, analytics, and RAG

Primary directories:

- `lib/actions/`
- `lib/`

### Data layer

Implemented with:

- Prisma schema in `prisma/schema.prisma`
- PostgreSQL as the main runtime database
- seed logic in `prisma/seed.ts`

### Integration layer

Implemented with:

- route handlers in `app/api/*`
- email delivery via Nodemailer
- arXiv sync scripts
- external LLM and transcription provider adapters

## 3. Main bounded contexts

### Publishing and discovery

- blog posts
- notes
- journal entries
- gallery albums
- content series
- tags and categories
- archives and related-post recommendations
- revision history and scheduled publishing

### Admin identity, security, and moderation

- admin-only sign-in
- admin email verification
- forgot/reset/change password
- custom session management
- admin-only 2FA
- login rate limiting and unusual-login alerts
- comment moderation, anti-spam, and rule management
- admin inbox and email notifications

### Research workspace

- paper topics and daily arXiv sync
- private admin paper library
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

1. A form submits to a Server Action or API route.
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

The current security model is built around:

- database-backed sessions stored in an HttpOnly cookie
- runtime acceptance of `ADMIN` sessions only
- admin route protection
- password reset and admin email verification
- admin-only 2FA
- login attempt rate limiting and unusual-login alerts
- audit logs for privileged actions

For comments, the model is intentionally different:

- public readers do not sign in
- guests can comment with a public name and optional private email
- anti-spam protection includes a honeypot, duplicate checks, rate limiting, and rule-based moderation
- optional IP-hash fingerprinting supports abuse control without exposing raw IPs in app logic

The Prisma schema still keeps simple role enums such as `ADMIN` and `READER` for compatibility, but the live product flow no longer provisions public reader accounts and rejects non-admin sessions.

## 6. Extensibility

Current extension points include:

- adding new provider adapters
- extending `/tools` with more AI utilities
- expanding the RAG knowledge model
- adding more exports and analytics reports
- introducing object storage or richer media pipelines

## 7. Recommended reading order

If you are onboarding to the codebase, read these next:

1. [feature-overview.md](./feature-overview.md)
2. [routes-and-apis.md](./routes-and-apis.md)
3. [deployment.md](./deployment.md)
4. [rag-v2.md](./rag-v2.md)
