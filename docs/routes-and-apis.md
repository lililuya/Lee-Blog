# Routes and APIs

This document summarizes the current route map, HTTP endpoints, and major Server Action groups.

## 1. Route groups

The application currently has five route families:

- public publishing routes
- account and authentication routes
- admin routes
- system output routes
- HTTP API routes

## 2. Public publishing routes

### Home and discovery

- `/` - homepage
- `/archive` - chronological archive
- `/search` - site-wide search
- `/series` - series index
- `/series/[slug]` - series detail
- `/tags` - tag index
- `/tags/[tag]` - tag detail
- `/categories` - category index
- `/categories/[category]` - category detail

### Content

- `/blog` - blog index
- `/blog/[slug]` - post detail and comments
- `/notes` - note index
- `/notes/[slug]` - note detail with backlinks
- `/journal` - journal index
- `/papers` - public papers page
- `/digest` - digest index
- `/digest/[slug]` - digest detail
- `/tools` - AI utilities and request validation entry

### Signed-in user pages

- `/papers/library` - personal paper library
- `/account` - account settings
- `/account/notifications` - in-app notifications center

## 3. Authentication routes

- `/login` - sign-in page
- `/register` - sign-up page
- `/forgot-password` - password reset request
- `/reset-password` - password reset completion
- `/verify-email` - email verification landing page

## 4. Admin routes

All `/admin/*` routes require an admin session.

### Overview and operations

- `/admin` - dashboard overview
- `/admin/analytics` - analytics panel
- `/admin/audit` - audit log
- `/admin/exports` - export controls
- `/admin/profile` - site profile editor
- `/admin/rag` - RAG management console

### Moderation and users

- `/admin/comments` - moderation queue and review history
- `/admin/comments/rules` - moderation rule management
- `/admin/users` - user list
- `/admin/users/[id]` - user detail and controls

### Content management

- `/admin/posts`
- `/admin/posts/new`
- `/admin/posts/[id]`
- `/admin/notes`
- `/admin/notes/new`
- `/admin/notes/[id]`
- `/admin/journal`
- `/admin/journal/new`
- `/admin/journal/[id]`
- `/admin/digests`
- `/admin/series`
- `/admin/series/new`
- `/admin/series/[id]`

### AI and research administration

- `/admin/providers`
- `/admin/providers/new`
- `/admin/providers/[id]`
- `/admin/papers`
- `/admin/papers/new`
- `/admin/papers/[id]`

## 5. System output routes

- `/feed.xml` - RSS feed
- `/feed.json` - JSON Feed
- `/robots.txt` - crawler rules
- `/sitemap.xml` - generated sitemap

## 6. HTTP API endpoints

## 6.1 Auth endpoints

- `POST /api/auth/login` - sign in with email and password
- `POST /api/auth/logout` - destroy session
- `POST /api/auth/register` - create a reader account
- `POST /api/auth/forgot-password` - request reset email
- `POST /api/auth/reset-password` - complete password reset
- `POST /api/auth/resend-verification` - send verification email again
- `POST /api/auth/verify-email` - consume verification token
- `POST /api/auth/2fa/verify` - verify admin 2FA challenge
- `POST /api/auth/2fa/cancel` - cancel pending 2FA challenge

## 6.2 App endpoints

- `POST /api/chat` - send chat requests to the selected provider, with page context and RAG support
- `POST /api/chat/transcribe` - validate and execute speech-to-text requests through the selected transcription provider
- `POST /api/tools/validate` - validate provider/API request settings from the tools UI
- `POST /api/telemetry/visit` - record page visits for analytics
- `GET /api/admin/export` - export site data for backup or migration

## 7. Major Server Action groups

Many important write flows use Server Actions instead of public HTTP APIs.

### Auth and account actions

- session creation and logout helpers
- avatar upload and removal
- password change
- 2FA setup, confirm, cancel, disable
- notification preference updates

### Content actions

- post create/update
- note create/update
- journal create/update
- scheduled publishing fields
- revision restore
- comment create, moderate, and delete

### Research actions

- paper topic CRUD
- library save / update / annotate
- digest generation and assignment
- RAG sync actions

### Admin actions

- user role and status changes
- mute / suspend / restore flows
- moderation rule CRUD
- export and audit-linked actions

## 8. Access model notes

- public publishing routes are readable without login
- commenting requires a signed-in user and may additionally require verified email
- `/papers/library`, `/account`, and `/account/notifications` require login
- `/admin/*` requires `ADMIN`
- some API routes are admin-only or login-gated even though they are HTTP endpoints

## 9. Suggested companion docs

- [architecture.md](./architecture.md)
- [feature-overview.md](./feature-overview.md)
- [deployment.md](./deployment.md)
- [rag-v2.md](./rag-v2.md)
