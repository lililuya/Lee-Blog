# Tech Stack and Learning Guide

This document explains the real stack used by the repository and suggests a learning path for anyone maintaining it.

## 1. Core stack

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

## 2. Codebase map

- `app/` - routes, layouts, route handlers
- `components/` - UI and form components
- `lib/` - domain logic, queries, actions, services
- `prisma/` - schema and seed
- `scripts/` - background sync/generation jobs
- `docs/` - product and operations documentation

## 3. Learning order

If you want to understand the repository efficiently, this order works well:

1. read the README and feature overview
2. read the route map and architecture docs
3. inspect `prisma/schema.prisma`
4. inspect `lib/auth.ts` and auth-related actions
5. inspect `lib/queries.ts`
6. inspect `lib/actions/*`
7. inspect the RAG docs and `lib/chat/*`

## 4. Daily maintenance commands

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:push`
- `npm run db:seed`
- `npm run content:sync`
- `npm run papers:sync`
- `npm run digest:generate`
- `npm run rag:sync`

## 5. Areas worth understanding deeply

If you plan to keep evolving the product, the highest-leverage areas are:

- Prisma schema design
- account and auth flows
- comment moderation and notifications
- provider and chat orchestration
- RAG ingestion and retrieval
- deployment and backup operations
