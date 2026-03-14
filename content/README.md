# Markdown Content Workflow

This project supports a local Markdown-to-database sync workflow.

Detailed docs:

English:

- `docs/notes-sync.md`: detailed notes sync guide
- `docs/routes-and-apis.md`: route and API reference

Chinese:

- `docs/notes-sync.zh-CN.md`: notes sync guide in Chinese
- `docs/routes-and-apis.zh-CN.md`: routes and API reference in Chinese

## Folder structure

- `content/blog/`: long-form posts that should appear in `/blog`
- `content/notes/`: evergreen notes that should appear in `/notes`
- `content/journal/`: lighter research updates that should appear in `/journal`

Files whose names start with `_` are ignored, which lets you keep templates in the same folder.

## Commands

```bash
npm run content:sync
npm run content:watch
```

- `content:sync`: one-time import from Markdown into PostgreSQL
- `content:watch`: watch local Markdown files and auto-sync after changes

## Blog frontmatter example

```md
---
title: Building a research-first blog
slug: research-first-blog
excerpt: Why a unified database-backed blog can still work beautifully with Markdown files.
category: Architecture
tags: blog, markdown, workflow
status: PUBLISHED
featured: true
publishedAt: 2026-03-12T08:00:00+08:00
coverImageUrl: https://example.com/cover.jpg
---

# Your article content

Write normal Markdown here.
```

## Notes frontmatter example

```md
---
title: RAG evaluation checklist
slug: rag-evaluation-checklist
summary: A compact, reusable note for review before shipping a RAG feature.
noteType: Checklist
tags: rag, evaluation, checklist
status: PUBLISHED
featured: false
publishedAt: 2026-03-12T08:10:00+08:00
---

## What this note is for

Write durable knowledge here.
```

## Journal frontmatter example

```md
---
title: Daily lab note
slug: daily-lab-note
summary: Short note about today's experiments and reading.
mood: focused
status: PUBLISHED
publishedAt: 2026-03-12T08:30:00+08:00
---

## What moved today

Write your note in Markdown.
```

## Notes management model

At runtime, the database is still the source of truth for features such as comments, moderation, search, feeds, and admin management.

For notes specifically, you can now manage them in two ways:

- Markdown-first via `content/notes` plus sync commands
- in-browser admin editing via `/admin/notes`

That means Markdown files are not rendered directly from disk on each request. They are imported into PostgreSQL and then served through the normal full-stack app.

## Recommended editors

This workflow works well with:

- Obsidian
- VS Code
- Typora
- Cursor
- Windsurf

## Recommended daily workflow

1. keep your writing in this repo under `content/`
2. edit locally in your preferred Markdown editor
3. run `npm run content:watch` in a terminal and keep it open while writing
4. refresh the site to see imported changes
5. use `npm run content:sync` when you only want a one-time manual import

## Practical note

Use `/notes` for content that should outlive a daily update but does not need to become a full article yet.

Good candidates:

- concept cards
- reading takeaways
- method notes
- checklists
- reference snippets
- reusable prompts or evaluation templates
