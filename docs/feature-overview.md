# Feature Overview

This document summarizes the current product scope of Scholar Blog Studio.

## 1. Positioning

The project now behaves like four tightly connected layers in one repository:

- a public academic-style website
- an admin-first publishing CMS
- a private research workspace for the site owner
- an AI tooling and RAG layer

## 2. Public-facing features

### Homepage and profile

- academic-style landing page
- profile, bio, links, and contact surfaces
- theme toggle
- responsive side-rail navigation

### Publishing

- blog posts
- evergreen notes
- journal entries
- gallery albums
- content series / collections
- scheduled publishing
- revision history and restore

### Discovery

- archive page
- tag landing pages
- category landing pages
- series landing pages
- related-post recommendations
- global search
- RSS and JSON Feed
- sitemap and robots output

## 3. Reader interaction and admin identity

### Public access model

- public reading does not require login
- public registration is closed
- `/register` remains as an informational page instead of a live signup flow

### Comment system

- guest commenting with required display name
- optional guest email for follow-up notifications
- anti-spam honeypot field
- rate limiting and duplicate-comment checks
- auto-review based on allow/block moderation rules
- moderation queue for risky comments
- threaded replies kept to a single readable layer
- admin replies publish immediately
- admin delete and review controls

### Admin authentication lifecycle

- admin-only sign-in
- logout
- admin email verification
- forgot password
- reset password
- change password
- session invalidation after sensitive changes
- login rate limiting and unusual-login alerts
- admin-only 2FA

### Notification loop

- admin email notifications for new comments and moderation events
- guest reply/review emails when an email address was provided
- private admin inbox under `/account/notifications`

## 4. Research workflow features

### Papers

- admin-managed arXiv topic definitions
- manual and scheduled paper sync
- public papers page
- private admin paper library
- reading status tracking (`TO_READ`, `READING`, `COMPLETED`, `ARCHIVED`)
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
- gallery CRUD
- digest review surfaces
- content series management
- scheduled publish fields
- revision history restore flows

### Moderation and private workspace

- comment moderation dashboard
- moderation rule management
- comment review notes and match inspection
- audit logs
- admin account preferences
- admin inbox and notification preferences

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
- password reset tokens
- admin email verification support
- login attempt rate limiting
- unusual login alerts
- admin-only 2FA
- moderation and audit controls
- guest-comment anti-spam and rule-based review

## 8. What is intentionally still lightweight

The project is already broad, but several areas stay intentionally practical:

- no public member area or reader-account product flow
- role design stays simple even though the schema still keeps legacy compatibility
- the private workspace is owner-focused rather than multi-user collaboration
- RAG sync is manual-first
- exports are designed for backup and migration, not multi-tenant reporting

## 9. Recommended next-level enhancements

Strong next steps after this version include:

- richer notification preferences
- scheduled background workers on the server side
- object storage for larger assets
- stronger analytics attribution
- multimodal RAG ingestion
