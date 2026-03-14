# Papers Operations Guide

This document explains where the `/papers` module gets its topics from, how to configure arXiv keywords, how to control the number of papers fetched per day, and how to schedule automatic sync runs.

## 1. Where paper topics are configured

Paper topics are managed from the admin UI:

- `/admin/papers`
- `/admin/papers/new`
- `/admin/papers/[id]`

Each topic is stored in the Prisma `PaperTopic` model and includes:

- `name`: display name
- `slug`: stable internal slug
- `description`: optional explanation
- `query`: raw arXiv query string
- `maxResults`: per-topic fetch limit for one sync run
- `enabled`: whether this topic participates in daily sync

## 2. Where keywords are configured

The effective keywords for the Papers page are configured in the `arXiv Query` field of each topic in `/admin/papers`.

Examples:

- `all:"large language model" AND cat:cs.CL`
- `all:"retrieval augmented generation"`
- `ti:"agent" AND cat:cs.AI`
- `cat:cs.LG AND all:"multimodal"`

This value is sent directly to the arXiv API as `search_query`.

Implementation reference:

- `components/forms/paper-topic-form.tsx`
- `lib/papers.ts`

## 3. How daily paper count is controlled

The number of papers fetched per topic is controlled by the `Daily Result Limit` field in `/admin/papers`.

Current behavior:

- the field maps to `PaperTopic.maxResults`
- one topic fetches up to `maxResults` papers per sync run
- `syncAllPaperTopics()` loops through all enabled topics and fetches each topic independently

Current validation rule:

- minimum: `1`
- maximum: `20`

Implementation reference:

- `components/forms/paper-topic-form.tsx`
- `lib/validators.ts`
- `lib/papers.ts`

Important note:

- if you set 5 topics and each topic uses `maxResults = 10`, a full sync can ingest up to about 50 topic-paper rows for that day
- the same paper can appear under different topics if different topic queries match it

## 4. How automatic schedule time is configured

The schedule is not currently managed from the admin UI.

It is configured in the deployment layer:

- GitHub Actions workflow schedule
- or your server cron / scheduled task

### 4.1 GitHub Actions schedule

Current workflow file:

- `.github/workflows/daily-papers.yml`

Current cron:

```yaml
schedule:
  - cron: "0 0 * * *"
```

GitHub Actions cron uses UTC.

So the current schedule means:

- every day at `00:00 UTC`
- which is every day at `08:00 Asia/Shanghai`

Examples:

- `0 0 * * *`: 08:00 Beijing / Shanghai
- `30 23 * * *`: 07:30 Beijing / Shanghai
- `0 1 * * *`: 09:00 Beijing / Shanghai

After changing the workflow file, commit and push it to GitHub for the new schedule to take effect.

### 4.2 Server cron schedule

If you do not want to rely on GitHub Actions, you can schedule the sync on the server itself.

Command:

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run papers:sync
```

Example Linux cron for 08:00 every day:

```cron
0 8 * * * cd /srv/scholar-blog-studio && docker compose -f docker-compose.prod.yml run --rm app npm run papers:sync
```

If your server timezone is not Asia/Shanghai, convert the time first or configure the server timezone explicitly.

## 5. How manual sync works

You can trigger sync in three ways:

- click `Sync All Topics` in `/admin/papers`
- click `Sync This Topic Now` inside `/admin/papers/[id]`
- run `npm run papers:sync`

Manual sync is useful when:

- you just changed a topic query
- you changed `maxResults`
- you enabled or disabled a topic
- you want to test the setup before waiting for the daily schedule

## 6. How the daily date bucket works

The Papers module uses `Asia/Shanghai` as its digest date boundary.

Implementation reference:

- `lib/papers.ts`

That means:

- papers synced on the same Shanghai local date are grouped under the same `digestDate`
- the weekly digest system also follows the same local date logic

## 7. Recommended management workflow

Recommended daily setup:

1. create one topic per research theme in `/admin/papers`
2. keep each query focused instead of putting too many concepts into one topic
3. set `maxResults` conservatively, such as `5` to `10`
4. use `enabled` to pause topics you do not want right now
5. run a manual sync once after every major topic change
6. then let GitHub Actions or cron handle the daily schedule

Recommended topic strategy:

- one topic for `LLM Agents`
- one topic for `RAG`
- one topic for `Multimodal`
- one topic for `Evaluation`

This is usually easier to manage than one very broad query.

## 8. Current management strengths

The current Papers module already supports:

- topic-level keyword configuration
- topic-level daily limit control
- enabled / disabled control
- manual sync for all topics
- manual sync for one topic
- recent synced paper preview
- user paper saving, reading status, and annotations

## 9. Current management gaps

The current implementation is solid for personal use, but it is not yet a fully fine-grained operations console.

Still missing if you want more precise control:

- per-topic schedule time
- admin UI for editing cron / schedule
- sync history table with success or failure logs
- excluded keywords / negative filters UI
- per-topic deduplication rules across overlapping queries
- alerting when scheduled sync fails

## 10. If you want stricter control next

If you want, the next useful upgrades for the Papers module would be:

- sync run history and error logs
- per-topic last synced time and last paper count
- test-query preview in admin before saving
- admin hints for common arXiv query templates
- configurable timezone and schedule settings in admin
