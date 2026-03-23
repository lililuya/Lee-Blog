# Content Update Workflow

This document is the English companion to the Chinese content refresh guide and focuses on day-to-day maintenance.

## 1. Quick reference

| What changed | Typical location | What to run | Browser refresh | Service restart |
| --- | --- | --- | --- | --- |
| Page copy, layout, styling | `app/**/*.tsx`, `components/**/*.tsx`, `app/globals.css` | Save file | Usually yes | No |
| Admin-edited database content | `/admin/*` | Click save | Usually yes | No |
| Markdown content | `content/blog`, `content/notes`, `content/journal` | `npm run content:sync` or `npm run content:watch` | Yes | No |
| Prisma schema | `prisma/schema.prisma` | `npm run db:push` | Yes | Recommended |
| Bootstrap admin or add optional demo content | `prisma/seed.ts`, `.env` | `npm run db:bootstrap` or `npm run db:seed:demo` | Maybe | Sometimes |
| Environment variables | `.env` | Restart app | Yes | Required |
| RAG knowledge after large content changes | site content + RAG settings | `npm run rag:sync` | Recommended | No |

Changing `ADMIN_*` values after bootstrap does not rewrite existing records. Update the live admin/profile manually if you need to change them on an existing database.

## 2. Recommended maintenance patterns

### UI-only change

For copy, styles, component layout, or admin page presentation:

1. save the file
2. let Next.js hot reload
3. refresh manually if needed

### Markdown-first content update

For blog, notes, or journal Markdown:

1. edit the Markdown file
2. run `npm run content:sync`
3. refresh the relevant page
4. optionally run `npm run rag:sync` if the change materially affects AI retrieval

### Database model change

For Prisma schema updates:

1. edit `prisma/schema.prisma`
2. run `npm run db:push`
3. restart `npm run dev` if behavior looks stale

### Auth, moderation, or notification flow change

For admin auth, guest comments, moderation rules, notifications, or provider logic:

1. update server code
2. validate the relevant route or API flow
3. run `npm run lint`
4. run `npm run build` before release

Typical examples:

- after changing admin sign-in, test `/login`
- after changing guest comments, submit a real guest comment
- after changing moderation rules, review one item in `/admin/comments`
- after changing the inbox flow, open `/account/notifications` as the admin

## 3. Recommended pre-release checklist

Before pushing a working branch, run:

```bash
npm run db:push
npm run lint
npm run build
```

If you changed content or RAG behavior, also consider:

```bash
npm run content:sync
npm run rag:sync
```
