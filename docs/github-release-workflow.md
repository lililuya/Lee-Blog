# GitHub Release Workflow

This guide is a practical runbook for managing this repository on GitHub after local development is complete.

## 1. Current branch model in this project

At the current stage, this repository typically uses:

- `main` as the stable branch
- feature or milestone branches with the `codex/` prefix

Examples:

- `codex/rag`
- `codex/release-docs-refresh-20260315`

For large changes, it is completely acceptable to treat one branch as a milestone snapshot instead of trying to split dozens of tiny commits retroactively.

## 2. Recommended local workflow

### 2.1 Start from the latest stable base

```bash
git checkout main
git pull
```

### 2.2 Create a working branch

```bash
git switch -c codex/your-feature-name
```

### 2.3 Develop and validate locally

At minimum:

```bash
npm run db:push
npm run lint
npm run build
```

If content or RAG behavior changed, also consider:

```bash
npm run content:sync
npm run rag:sync
```

### 2.4 Commit and push

```bash
git add README.md app components docs lib prisma scripts package.json package-lock.json
git commit -m "feat: your milestone summary"
git push -u origin codex/your-feature-name
```

If you intentionally need uploaded files in version control, add `public/uploads` explicitly. Otherwise, do not add it by default.

## 3. How to choose the PR base branch

Use these rules:

- If `main` does not yet contain the previous milestone, open the next PR against the previous milestone branch first.
- If `main` already contains the previous milestone, open the PR directly against `main`.

Example:

1. `codex/rag -> main`
2. `codex/release-docs-refresh-20260315 -> main`

This keeps the PR diff focused and easier to review.

## 4. Recommended PR process

1. Push the branch.
2. Open a Pull Request on GitHub.
3. Verify the `CI` workflow status.
4. Review file changes and commit summaries.
5. Merge only after CI passes.

Suggested PR structure:

- title: a short milestone summary
- body: what changed, how it was tested, and any deployment notes

## 5. GitHub Actions in this repository

Current workflows:

- `CI`: validates install, database push, seed, lint, and build
- `Deploy`: builds the image, pushes to GHCR, then deploys to the server over SSH
- `Daily Papers Sync`: triggers paper sync on the server
- `Weekly Digest`: triggers digest generation on the server

## 6. Required GitHub Secrets

Set these under:

`GitHub -> Settings -> Secrets and variables -> Actions`

Required for deployment and scheduled server-side jobs:

- `SSH_HOST`
- `SSH_USERNAME`
- `SSH_PRIVATE_KEY`
- `SSH_PORT`
- `APP_ENV_FILE`
- `GHCR_PAT`

## 7. What `APP_ENV_FILE` is

`APP_ENV_FILE` should be the full production `.env` contents stored as one multi-line secret.

It should include at least:

- database settings
- `APP_URL`
- `SESSION_SECRET`
- seeded admin credentials
- any SMTP settings you use
- AI provider keys
- transcription provider settings
- RAG embedding settings

## 8. Server-side prerequisites

Before `Deploy` can succeed, your server should already have:

- Docker installed
- `docker compose` available
- a user that can run Docker commands
- the directory `/srv/scholar-blog-studio`
- `docker-compose.prod.yml` uploaded to that directory

The current deploy workflow is not a full zero-to-server bootstrap script.

## 9. Recommended first deployment order

1. Prepare GitHub Secrets.
2. Prepare the server.
3. Upload `docker-compose.prod.yml`.
4. Confirm the SSH user can run Docker.
5. Merge to `main` or run `Deploy` manually.
6. Verify the site, login, admin pages, and notifications.
7. Trigger `Daily Papers Sync` manually once.
8. Trigger `Weekly Digest` manually once if needed.

## 10. If Actions fail

Use this quick diagnosis model:

### `CI` failed

Usually means:

- install failed
- Prisma schema failed
- seed failed
- lint failed
- build failed

This is usually a code/config problem inside the repository, not a missing GitHub secret.

### `Deploy` failed

Usually means:

- missing `SSH_*` secrets
- missing `APP_ENV_FILE`
- missing `GHCR_PAT`
- server missing `docker-compose.prod.yml`
- server user cannot run Docker

### `Daily Papers Sync` or `Weekly Digest` failed

Usually means:

- SSH/server configuration is incomplete
- deployment was never completed successfully
- the remote compose/app environment is not ready

## 11. Suggested long-term workflow

For this project, the most reliable ongoing process is:

1. code locally
2. validate locally
3. push a feature branch
4. open a PR
5. wait for CI
6. merge to `main`
7. let Deploy run
8. monitor scheduled workflows

## 12. Related docs

- [deployment.md](./deployment.md)
- [deployment.zh-CN.md](./deployment.zh-CN.md)
- [routes-and-apis.md](./routes-and-apis.md)
