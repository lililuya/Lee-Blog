# Feature Overview

This document is the product-level summary for the current version of Scholar Blog Studio.

## 1. Positioning

The project is best understood as three products merged into one repository:

- a personal academic website
- a lightweight publishing CMS
- a research workspace with AI-assisted tooling

## 2. Public-facing features

### Homepage and profile

- academic-style landing page
- profile, bio, and contact surfaces
- theme toggle
- responsive layout with side-rail navigation

### Content publishing

- blog posts
- evergreen notes
- journal entries
- content series / collections
- scheduled publishing
- revision history and restore

### Discovery and navigation

- archive page
- tag landing pages
- category landing pages
- series landing pages
- related-post recommendations
- global search
- RSS and JSON Feed
- sitemap and robots output

## 3. Account and community features

### Authentication lifecycle

- registration
- login
- logout
- email verification
- forgot password
- reset password
- change password
- session invalidation on sensitive changes

### Comment system

- signed-in commenting
- optional email verification gate before commenting
- per-user rate limiting
- spam heuristics and duplicate checks
- moderation queue
- auto-review based on allow/block rule lists
- threaded reply support
- admin delete and review controls

### Notification loop

- email notifications for comment lifecycle events
- in-app notifications under `/account/notifications`
- unread counters in navigation

## 4. Research workflow features

### Papers

- admin-managed arXiv topic definitions
- manual and scheduled paper sync
- public papers page
- signed-in personal library
- status tracking (`TO_READ`, `READING`, `COMPLETED`, `ARCHIVED`)
- progress percentage
- last-read tracking
- annotations and highlighted quotes

### Weekly digests

- digest generation from synced paper data
- public digest pages
- admin digest management
- digest citation export

### Knowledge linking

- note backlinks detected from content references
- citation text export
- BibTeX export for papers and digests

## 5. Admin and operations features

### Content administration

- posts CRUD
- notes CRUD
- journal CRUD
- digest review surfaces
- content series management
- scheduled publish fields
- revision history restore flows

### Moderation and user management

- comment moderation dashboard
- moderation rule management
- user role changes
- mute / unmute
- suspend / restore
- soft delete / restore
- revoke sessions
- audit logs

### Analytics and exports

- analytics dashboard
- data export endpoint and admin export screen
- admin overview cards

## 6. AI and RAG features

### Provider management

- multi-provider model registry
- provider enable/disable and per-model settings
- configurable transcription providers
- API validation lab for debugging provider calls

### Chat

- floating chat widget
- page-aware prompts
- provider switching
- transcription provider switching

### RAG

- manual knowledge sync
- hybrid retrieval design
- RAG admin console
- chunk/source visibility and readiness view

## 7. Security features

- custom session auth
- HttpOnly cookie storage
- email verification support
- password reset tokens
- login attempt rate limiting
- unusual login alerts
- admin-only 2FA
- moderation and audit controls

## 8. What is intentionally still lightweight

The project is already broad, but some areas are intentionally practical rather than enterprise-heavy:

- roles are simple (`ADMIN` and `READER`)
- notification center is focused on comment/account flows
- RAG sync is manual-first
- exports are designed for migration and backup, not multi-tenant reporting

## 9. Recommended next-level enhancements

If you continue after this version, strong candidates include:

- richer notification preferences
- scheduled background workers on the server side
- object storage for larger assets
- stronger analytics attribution
- multimodal RAG ingestion
