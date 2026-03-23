# Routes and APIs

This document summarizes the current route map, HTTP endpoints, and major Server Action groups.

## 1. Route groups

The application currently has five route families:

- public publishing routes
- admin sign-in and private workspace routes
- admin console routes
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
- `/gallery` - gallery index
- `/gallery/[slug]` - gallery detail
- `/papers` - public papers page
- `/digest` - digest index
- `/digest/[slug]` - digest detail
- `/tools` - AI utilities and request validation entry

## 3. Admin sign-in and private workspace routes

- `/login` - admin sign-in page
- `/register` - registration-closed information page
- `/forgot-password` - password reset request
- `/reset-password` - password reset completion
- `/verify-email` - admin email verification landing page
- `/account` - admin account, security, and preference page
- `/account/notifications` - private admin inbox
- `/papers/library` - private admin paper library

## 4. Admin routes

All `/admin/*` routes require an admin session.

### Overview and operations

- `/admin` - dashboard overview
- `/admin/analytics` - analytics panel
- `/admin/audit` - audit log
- `/admin/exports` - export controls
- `/admin/profile` - site profile editor
- `/admin/rag` - RAG management console

### Moderation and management

- `/admin/comments` - moderation queue and review history
- `/admin/comments/rules` - moderation rule management
- `/admin/users` - user/session list for legacy records and controls
- `/admin/users/[id]` - user detail and controls

### Content management

- `/admin/posts`
- `/admin/posts/new`
- `/admin/posts/[id]`
- `/admin/categories`
- `/admin/notes`
- `/admin/notes/new`
- `/admin/notes/[id]`
- `/admin/journal`
- `/admin/journal/new`
- `/admin/journal/[id]`
- `/admin/gallery`
- `/admin/gallery/new`
- `/admin/gallery/[id]`
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

### 6.1 Auth endpoints

- `POST /api/auth/login` - sign in with email and password
- `POST /api/auth/logout` - destroy the current session
- `POST /api/auth/register` - returns `403` because public registration is closed
- `POST /api/auth/forgot-password` - request a reset email
- `POST /api/auth/reset-password` - complete password reset
- `POST /api/auth/resend-verification` - send admin verification email again
- `POST /api/auth/verify-email` - consume verification token
- `POST /api/auth/2fa/verify` - verify admin 2FA challenge
- `POST /api/auth/2fa/cancel` - cancel pending 2FA challenge

### 6.2 App endpoints

- `POST /api/chat` - send chat requests to the selected provider, with page context and RAG support
- `POST /api/chat/transcribe` - validate and execute speech-to-text requests through the selected transcription provider
- `POST /api/tools/validate` - validate provider/API request settings from the tools UI
- `POST /api/telemetry/visit` - record page visits for analytics
- `POST /api/admin/gallery/assets` - upload gallery image assets for the admin form
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
- post category rename / merge
- note create/update
- journal create/update
- gallery create/update/delete
- scheduled publishing fields
- revision restore
- guest/admin comment create
- comment moderate and delete

### Research actions

- paper topic CRUD
- library save / update / annotate
- digest generation and assignment
- RAG sync actions

### Admin actions

- moderation rule CRUD
- export and audit-linked actions
- user/session management helpers for retained admin tools

## 8. Access model notes

- public publishing routes are readable without login
- comments can be submitted by guests or by the signed-in admin
- guest comments require a name, while guest email remains optional
- `/register` is not a live signup flow anymore
- `/account`, `/account/notifications`, and `/papers/library` are private admin workspace routes
- `/admin/*` requires `ADMIN`
- some API routes are admin-only even though they are exposed as HTTP endpoints

## 9. Suggested companion docs

- [architecture.md](./architecture.md)
- [feature-overview.md](./feature-overview.md)
- [deployment.md](./deployment.md)
- [gallery-module.md](./gallery-module.md)
- [rag-v2.md](./rag-v2.md)
