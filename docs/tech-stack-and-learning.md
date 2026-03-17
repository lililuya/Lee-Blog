# Tech Stack and Learning Guide

This document explains the real stack used by the repository and suggests a practical learning path for anyone maintaining it.

## 1. What this project actually is

This repository is not just a theme or a static blog shell. It is a single full-stack product that combines:

- a public publishing site
- an admin-first content management system
- a private research workspace for the site owner
- AI tooling, provider orchestration, and RAG

The current product model matters when reading the code:

- public readers do not need accounts
- public registration is closed
- only the admin can sign in
- guest comments replace the old reader-account participation flow

## 2. Core stack

### Frontend and app framework

- React 19
- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- lucide-react
- react-markdown
- remark-gfm

### Server and business logic

- Next.js Route Handlers
- Next.js Server Actions
- custom session auth
- Zod
- bcryptjs
- Nodemailer

### Data and persistence

- Prisma
- PostgreSQL

### Tooling

- ESLint
- tsx scripts
- Docker / Docker Compose
- GitHub Actions

## 3. Codebase map

- `app/` - routes, layouts, route handlers
- `components/` - UI and form components
- `lib/` - domain logic, queries, actions, services
- `prisma/` - schema and seed
- `scripts/` - background sync and generation jobs
- `docs/` - product and operations documentation

## 4. Learning order

If you want to understand the repository efficiently, this order works well:

1. read the README and feature overview
2. read the route map and architecture docs
3. inspect `prisma/schema.prisma`
4. inspect `lib/auth.ts`, password-reset logic, and moderation-related actions
5. inspect `lib/queries.ts`
6. inspect `lib/actions/*`
7. inspect the RAG docs and `lib/chat/*`

## 5. Daily maintenance commands

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:push`
- `npm run db:seed`
- `npm run content:sync`
- `npm run papers:sync`
- `npm run digest:generate`
- `npm run rag:sync`

## 6. Areas worth understanding deeply

If you plan to keep evolving the product, the highest-leverage areas are:

- Prisma schema design
- admin-only auth and account recovery
- guest comment moderation and notifications
- content publishing, scheduling, and revisions
- provider and chat orchestration
- RAG ingestion and retrieval
- deployment and backup operations
