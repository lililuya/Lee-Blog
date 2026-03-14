# Architecture

## 1. Project goal

This is not a static homepage that only displays profile information.
It is a full-stack personal publishing system designed for long-term maintenance.

The product goals are:

- present an academic-style personal homepage
- support long-form writing and lighter journal updates
- provide comment moderation and admin workflows
- connect research input with research output through papers and weekly digests
- leave room for future AI tools
- stay easy to deploy and operate as a single self-managed application

## 2. Why an integrated full-stack repository is a good fit here

In current industry practice, blogs do not all use the same architecture.
Common patterns include:

1. static sites
2. frontend/backend split applications
3. integrated full-stack applications

This project uses the third model.

That means:

- pages, backend logic, auth, admin, and database access are kept in one repository
- the application is still layered, but it is deployed and maintained as one system
- validation, auth rules, and data access are shared across the stack

For a self-managed blog, this reduces complexity in:

- deployment
- maintenance
- debugging
- future feature expansion

It is especially useful once you add admin tools, comment flows, scheduled jobs, and AI service modules.

## 3. System modules

### Public site

- `/` homepage
- `/blog` blog index
- `/blog/[slug]` post detail and comments
- `/journal` journal index
- `/papers` daily paper archive
- `/digest` weekly digest index
- `/digest/[slug]` weekly digest detail
- `/search` site search
- `/tools` reserved tools area
- `/login` / `/register` auth pages
- `/feed.xml` / `/feed.json` feed output

### Admin site

- `/admin` dashboard overview
- `/admin/posts` post management
- `/admin/journal` journal management
- `/admin/comments` comment moderation
- `/admin/profile` profile management
- `/admin/providers` LLM provider management
- `/admin/papers` paper topic management
- `/admin/digests` weekly digest management
- `/admin/users` user management and permissions

### Server capabilities

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`
- `/api/chat`
- `lib/actions/*` server actions for admin forms, comments, paper sync, digests, and user moderation

## 4. Data flow

### Read path

1. pages call functions in `lib/queries.ts`
2. queries load data from PostgreSQL through Prisma
3. if the database is not configured, the app can fall back to demo data for selected public pages
4. server components render with fetched data directly

### Write path

1. admin forms submit to `lib/actions/*`
2. input is validated with Zod
3. Prisma writes to PostgreSQL
4. `revalidatePath` refreshes affected pages
5. the user is redirected back to the relevant screen

### Auth path

1. sign-in or registration goes through `/api/auth/*`
2. the app validates credentials against the `User` table
3. a `Session` record is created
4. the session token is stored in an HttpOnly cookie
5. server-side route protection reads the current user from the session

## 5. Papers and digests

### Daily papers

Admins configure `PaperTopic` entries with:

- topic name
- arXiv query string
- maximum result count
- enabled status

Then papers can be synced through:

- admin controls
- `npm run papers:sync`
- GitHub Actions or server cron

Synced items are stored as `DailyPaperEntry` records.

### Weekly digests

Weekly digests are generated from:

- published posts
- published journal entries
- daily paper entries

Core implementation:

- `lib/digests.ts`
- `lib/actions/digest-actions.ts`
- `scripts/generate-weekly-digest.ts`

The digest window is calculated using Asia/Shanghai local time and summarizes the previous complete week.

## 6. User management model

The system now supports richer account state management.

### Role

- `ADMIN`
- `READER`

### Status

- `ACTIVE`
- `SUSPENDED`
- `DELETED`

### Moderation-related fields

- `mutedUntil`
- `muteReason`
- `statusReason`
- `lastLoginAt`
- `deletedAt`

### Rules

- muted users can still sign in but cannot post comments
- suspended users cannot sign in
- deleted users are soft-deleted and cannot sign in
- self-destructive admin actions are blocked
- the last active admin account cannot be demoted, suspended, or deleted

## 7. Core data models

- `User`
- `Session`
- `SiteProfile`
- `Post`
- `JournalEntry`
- `Comment`
- `LlmProvider`
- `PaperTopic`
- `DailyPaperEntry`
- `WeeklyDigest`

## 8. Recommended way to read the repo

```text
app/
  public routes, admin routes, api routes
components/
  site, admin, forms, ui
lib/
  auth, queries, prisma, actions, papers, digests, feeds, user-state
prisma/
  schema.prisma, seed.ts
scripts/
  sync-daily-papers.ts, generate-weekly-digest.ts
.github/workflows/
  ci, deploy, daily-papers, weekly-digest
```

## 9. Extension priorities

Recommended next product steps:

- saved papers and annotations
- stronger tag/topic archives
- newsletter delivery
- full-text search improvements
- image upload and object storage
- observability and alerting
- AI writing and research assistant tools in `/tools`