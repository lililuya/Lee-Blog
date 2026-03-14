# Routes and API Reference

This document summarizes the user-facing routes, admin routes, HTTP API endpoints, and important Server Actions in the project.

## 1. Route groups

The application is organized into four broad route groups:

- public content routes
- authentication routes
- admin routes
- system output routes

## 2. Public routes

### Home and content

- `/`: homepage
- `/blog`: blog index
- `/blog/[slug]`: blog detail page
- `/journal`: journal index
- `/notes`: evergreen note index
- `/notes/[slug]`: evergreen note detail page
- `/papers`: daily papers page
- `/papers/library`: signed-in user's paper library
- `/digest`: weekly digest index
- `/digest/[slug]`: weekly digest detail page
- `/search`: site-wide search page
- `/tools`: reserved future tools area

### Authentication

- `/login`: sign-in page
- `/register`: sign-up page

## 3. Admin routes

All `/admin/*` routes require an admin session.

### Dashboard and system surfaces

- `/admin`: dashboard overview
- `/admin/audit`: audit log view
- `/admin/comments`: comment moderation
- `/admin/users`: user management list
- `/admin/users/[id]`: user detail and controls
- `/admin/profile`: homepage profile editor

### Content management

- `/admin/posts`: blog post list
- `/admin/posts/new`: create blog post
- `/admin/posts/[id]`: edit blog post
- `/admin/journal`: journal entry list
- `/admin/journal/new`: create journal entry
- `/admin/journal/[id]`: edit journal entry
- `/admin/notes`: evergreen note list
- `/admin/notes/new`: create evergreen note
- `/admin/notes/[id]`: edit evergreen note
- `/admin/digests`: weekly digest management

### Model and paper management

- `/admin/providers`: LLM provider list
- `/admin/providers/new`: create provider
- `/admin/providers/[id]`: edit provider
- `/admin/papers`: paper topic list
- `/admin/papers/new`: create paper topic
- `/admin/papers/[id]`: edit paper topic

## 4. System output routes

- `/feed.xml`: RSS feed
- `/feed.json`: JSON Feed
- `/robots.txt`: robots rules
- `/sitemap.xml`: generated sitemap

## 5. HTTP API endpoints

The project currently exposes a small set of HTTP endpoints under `app/api`.

## 5.1 `POST /api/auth/login`

Purpose:

- log in a user with email and password

Request body:

```json
{
  "email": "admin@example.com",
  "password": "ChangeMe123!"
}
```

Success response:

```json
{
  "ok": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

Failure response:

```json
{
  "ok": false,
  "error": "Login failed."
}
```

Notes:

- also creates the session cookie
- used by the login form and can be called programmatically

## 5.2 `POST /api/auth/register`

Purpose:

- create a new reader account

Request body:

```json
{
  "name": "Reader Demo",
  "email": "reader@example.com",
  "password": "ReaderDemo123!"
}
```

Success response:

- HTTP status `201`

```json
{
  "ok": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "READER",
    "status": "ACTIVE"
  }
}
```

Failure response:

```json
{
  "ok": false,
  "error": "Registration failed."
}
```

## 5.3 `POST /api/auth/logout`

Purpose:

- destroy the current session

Request body:

- none

Success response:

```json
{
  "ok": true
}
```

## 5.4 `POST /api/chat`

Purpose:

- send a chat request from the floating widget to a configured LLM provider

Access:

- requires a signed-in user

Request body:

```json
{
  "providerSlug": "deepseek-chat",
  "messages": [
    { "role": "user", "content": "Summarize the notes section." }
  ]
}
```

Supported message roles:

- `system`
- `user`
- `assistant`

Success response:

```json
{
  "ok": true,
  "content": "...assistant reply..."
}
```

Common failure responses:

```json
{
  "ok": false,
  "error": "Please sign in before using the chat widget."
}
```

```json
{
  "ok": false,
  "error": "Chat request failed."
}
```

Notes:

- the provider must be enabled in admin
- the corresponding API key environment variable must exist
- the frontend only shows enabled providers with non-empty env values


## 5.5 `POST /api/telemetry/visit`

Purpose:

- record an anonymized visitor pulse for footer analytics

Access:

- public
- intended for same-origin browser calls from the site itself

Request body example:

```json
{
  "path": "/notes/rag-evaluation-checklist",
  "timezone": "Asia/Shanghai",
  "language": "zh-CN"
}
```

What the server stores:

- a hashed IP fingerprint, not the raw IP address
- inferred regional cluster from proxy headers or browser timezone
- last visited path
- language and lightweight visit counters

Notes:

- bot-like user agents are skipped
- when geo headers are unavailable, the system falls back to timezone-based regional grouping
- this powers the footer map and runtime telemetry card, not a full analytics dashboard
## 6. Server Actions overview

Most authenticated mutations and nearly all admin mutations are implemented as Server Actions, not public REST endpoints.

That means:

- forms submit directly to server functions
- they are internal application interfaces
- they should be documented for maintainability, but not treated as stable public APIs

## 6.1 Auth Server Actions

File:

- `lib/actions/auth-actions.ts`

Actions:

- `loginAction(formData)`
- `registerAction(formData)`
- `logoutAction()`

Used by:

- `/login`
- `/register`
- header logout controls

## 6.2 Content Server Actions

File:

- `lib/actions/content-actions.ts`

Actions:

- `createPostAction`
- `updatePostAction`
- `deletePostAction`
- `createJournalAction`
- `updateJournalAction`
- `deleteJournalAction`
- `createNoteAction`
- `updateNoteAction`
- `deleteNoteAction`
- `saveProfileAction`
- `createProviderAction`
- `updateProviderAction`
- `deleteProviderAction`
- `moderateCommentAction`
- `createCommentAction`

Permissions:

- posts, journal, notes, profile, providers, and comment moderation: admin only
- comment creation: signed-in user

Blog post fields:

- `title`
- `slug`
- `excerpt`
- `content`
- `category`
- `tags`
- `status`
- `featured`
- `coverImageUrl`
- `publishedAt`

Journal fields:

- `title`
- `slug`
- `summary`
- `content`
- `mood`
- `status`
- `publishedAt`

Note fields:

- `title`
- `slug`
- `summary`
- `content`
- `noteType`
- `tags`
- `status`
- `featured`
- `publishedAt`

Comment creation fields:

- `postId`
- `postSlug`
- `content`

## 6.3 Paper Server Actions

File:

- `lib/actions/paper-actions.ts`

Admin actions:

- `createPaperTopicAction`
- `updatePaperTopicAction`
- `deletePaperTopicAction`
- `syncAllPaperTopicsAction`
- `syncSinglePaperTopicAction`

Signed-in user actions:

- `savePaperToLibraryAction`
- `updatePaperLibraryStatusAction`
- `removePaperFromLibraryAction`
- `addPaperAnnotationAction`
- `deletePaperAnnotationAction`

Paper topic fields:

- `name`
- `slug`
- `description`
- `query`
- `maxResults`
- `enabled`

Paper library fields:

- `arxivId`
- `title`
- `summary`
- `authors`
- `paperUrl`
- `pdfUrl`
- `primaryCategory`
- `topicName`
- `digestDate`
- `libraryItemId`
- `status`
- `annotationId`
- `quote`
- `redirectTo`

## 6.4 Digest Server Actions

File:

- `lib/actions/digest-actions.ts`

Actions:

- `generateWeeklyDigestAction`
- `deleteWeeklyDigestAction`

Permissions:

- admin only

## 6.5 User management Server Actions

File:

- `lib/actions/user-actions.ts`

Actions:

- `changeUserRoleAction`
- `muteUserAction`
- `unmuteUserAction`
- `suspendUserAction`
- `restoreUserAction`
- `deleteUserAction`
- `revokeUserSessionsAction`

Key fields:

- `userId`
- `role`
- `days`
- `reason`
- `redirectTo`

Safety rules enforced in code:

- admin cannot apply destructive moderation to themselves
- the last active admin cannot be demoted, suspended, or deleted
- suspension and deletion revoke active sessions

## 7. Notes and Markdown sync

The `/notes` module now supports two write paths:

- Admin UI via `/admin/notes`
- Markdown-first workflow via `content/notes` plus `npm run content:sync`

Important behavior:

- public note pages always read from the database
- Markdown sync uses `slug` as the upsert key
- admin CRUD updates rows directly in the `Note` table
- deleting a Markdown file does not automatically delete the database row

Related documentation:

- `docs/notes-sync.md`
- `docs/notes-sync.zh-CN.md`
- `content/README.md`

## 8. Access summary

Public access:

- homepage, blog, notes, journal, papers, digest, feeds, search, login, register

Signed-in user access:

- chat widget
- paper library and annotations
- comment submission

Admin access:

- all `/admin/*` pages
- content CRUD
- comment moderation
- provider management
- paper topic management and sync
- digest generation
- user moderation and audit review

## 9. Recommended maintenance habit

When you add a new page, endpoint, or Server Action, update this file together with the feature so documentation stays aligned with the codebase.

