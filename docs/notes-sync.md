# Notes Sync Guide

This document explains what the `/notes` module is for, where note Markdown files should live, how synchronization works, and how the admin CRUD workflow fits into the same system.

## 1. What `/notes` is for

The `/notes` module is designed for durable knowledge that sits between:

- `journal`: lightweight, time-sensitive updates
- `blog`: polished long-form writing

Good note candidates:

- concept summaries
- reading takeaways
- method notes
- checklists
- reference snippets
- reusable prompts or evaluation templates

You can think of `/notes` as your evergreen knowledge layer.

## 2. Where note files live

Store note Markdown files in:

```text
content/notes/
```

Ignored files:

- filenames starting with `_`
- `README.md`

Template file:

```text
content/notes/_template.md
```

Recommended practice:

- keep one note per `.md` file
- use stable filenames and slugs
- keep title, filename, and slug aligned when possible

## 3. How sync works

This project does not render Markdown directly from disk at request time.

Instead, the flow is:

1. you write Markdown under `content/notes`
2. the sync script parses frontmatter and Markdown body
3. the content is upserted into the `Note` table in PostgreSQL
4. the website reads notes from the database at runtime

Why this design is used:

- it keeps runtime behavior consistent with the rest of the full-stack app
- search, feeds, sitemap output, and admin features all work from the same database records
- notes can be managed both from files and from the browser without building two separate runtime systems

## 4. Frontmatter reference

Recommended minimal note frontmatter:

```md
---
title: RAG evaluation checklist
slug: rag-evaluation-checklist
summary: A compact note for review before shipping a RAG feature.
noteType: Checklist
tags: rag, evaluation, checklist
status: PUBLISHED
featured: false
publishedAt: 2026-03-12T08:10:00+08:00
---
```

Supported fields:

- `title`: note title
- `slug`: public URL slug; if omitted, generated from filename or title
- `summary`: short overview used in list cards, search, and feeds
- `noteType`: display label such as `Checklist`, `Method Note`, or `Reading Note`
- `tags`: comma-separated list or YAML array
- `status`: `DRAFT`, `PUBLISHED`, or `ARCHIVED`
- `featured`: `true` or `false`
- `publishedAt`: ISO datetime string

Default behavior:

- if `summary` is missing, the sync script generates one from the content
- if `noteType` is missing, it defaults to `Knowledge Note`
- if `status` is `PUBLISHED` and `publishedAt` is missing, the current sync time is used

## 5. One-time sync

Run:

```bash
npm run content:sync
```

What it does:

- scans `content/blog`
- scans `content/notes`
- scans `content/journal`
- upserts matching records into PostgreSQL

Example success output:

```text
Synced 2 blog file(s), 3 note file(s), and 4 journal file(s).
```

## 6. Live watch mode

Run:

```bash
npm run content:watch
```

What it does:

- watches `content/blog`
- watches `content/notes`
- watches `content/journal`
- reruns sync automatically after Markdown changes

Recommended workflow:

1. start `npm run content:watch`
2. edit notes in your Markdown editor
3. save the file
4. refresh the browser
5. verify the updated note at `/notes`

## 7. Full note creation workflow

Recommended process for a new note:

1. copy `content/notes/_template.md`
2. rename it to something meaningful such as `rag-evaluation-checklist.md`
3. fill in the frontmatter
4. write the Markdown body
5. run `npm run content:sync`, or keep `npm run content:watch` running
6. open `/notes`
7. open `/notes/[slug]` and confirm the result

## 8. Admin UI management

Notes can also be created and edited from the admin UI:

- `/admin/notes`
- `/admin/notes/new`
- `/admin/notes/[id]`

Recommended usage split:

- use Markdown sync for a writing-first workflow in Obsidian, VS Code, Typora, or similar tools
- use the admin UI for quick browser edits, cleanup, publishing changes, or deletion

Important detail:

- both workflows write to the same `Note` table
- Markdown sync uses `slug` as the upsert key
- admin CRUD edits records directly by database ID

## 9. Updating an existing note

When you edit a file in `content/notes` and sync again, the import logic uses `slug` as the upsert key:

- same slug: updates the existing note record
- new slug: creates a new note record

Implication:

If you change the slug, the system treats it as a new note unless the old record is manually archived or deleted.

## 10. Deleting a note

Current behavior:

- removing a Markdown file does not automatically delete the database record

Why:

- the sync currently performs upsert, not destructive reconciliation

Safe ways to handle removal:

- set the note `status` to `ARCHIVED`
- delete it from `/admin/notes`
- remove the database record manually

## 11. Public routes related to notes

User-facing routes:

- `/notes`: note index page
- `/notes/[slug]`: note detail page

Related system output:

- `/search`: published notes are included in site search
- `/feed.xml`: published notes are included in RSS output
- `/feed.json`: published notes are included in JSON Feed output
- `/sitemap.xml`: published note URLs are included in the sitemap

## 12. Data model summary

Notes are stored in the Prisma `Note` model.

Key fields:

- `title`
- `slug`
- `summary`
- `content`
- `noteType`
- `tags`
- `status`
- `featured`
- `publishedAt`
- `authorId`

Author behavior during Markdown sync:

- imported notes are attached to the first admin account found in the database

That means:

- at least one admin must exist before sync runs
- run `npm run db:seed` first if the database is new

## 13. Common problems

### `npm run content:sync` shows `0 note file(s)`

Check:

- the file is inside `content/notes`
- the extension is `.md`
- the filename does not start with `_`
- the directory contains actual note files beyond `_template.md`

### The note does not appear on `/notes`

Check:

- `status` is `PUBLISHED`
- sync completed successfully
- database connection is valid
- the slug is what you expected

### The note appears but the URL is wrong

Check:

- the `slug` in frontmatter
- if `slug` is omitted, the generated slug from filename or title

### Sync fails because no admin exists

Run:

```bash
npm run db:seed
```

## 14. Recommended note taxonomy

To keep the system manageable as note count grows, try to keep `noteType` within a stable set, for example:

- `Knowledge Note`
- `Checklist`
- `Method Note`
- `Reading Note`
- `Prompt Pattern`
- `Reference`

## 15. Recommended editors

This workflow works well with:

- Obsidian
- VS Code
- Typora
- Cursor
- Windsurf

## 16. Practical rule of thumb

Use:

- `journal` for process and progress
- `notes` for durable knowledge
- `blog` for polished public writing
