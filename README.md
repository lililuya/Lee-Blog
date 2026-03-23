# Scholar Blog Studio

A self-managed full-stack academic blog, admin workspace, and AI-ready publishing system built with `Next.js + TypeScript + Prisma + PostgreSQL`.

一个可自托管的全栈学术博客、管理员工作台与 AI 内容系统，基于 `Next.js + TypeScript + Prisma + PostgreSQL` 构建。

## Highlights / 版本亮点

- Public publishing and discovery: blog posts, notes, journal entries, gallery albums, content series, archive, tags, categories, related posts, search, RSS, and JSON Feed.
- 前台内容发布与发现：博客、Notes、Journal、图集、内容系列、归档、标签、分类、相关文章、站内搜索、RSS 与 JSON Feed。
- Research workflow: daily arXiv topic sync, public papers feed, private admin paper library, annotations, reading progress, backlinks, weekly digests, citation copy, and BibTeX export.
- 研究工作流：每日 arXiv 主题同步、公开 Papers 页面、管理员私有论文库、批注、高亮、阅读进度、反向链接、周报、引文复制与 BibTeX 导出。
- Reader interaction and security: guest comments, anti-spam checks, moderation rules, email notifications, admin-only sign-in, email verification, password reset/change, and admin 2FA.
- 读者互动与安全：游客评论、反垃圾检测、评论审核规则、邮件通知、仅管理员登录、邮箱验证、找回/修改密码，以及管理员 2FA。
- Admin operations: admin console, audit log, scheduled publishing, revision history, exports, analytics dashboard, provider management, and RAG admin tools.
- 后台运维能力：管理后台、审计日志、定时发布、修订历史、数据导出、分析面板、模型提供商管理与 RAG 后台。
- AI and tooling: floating multi-provider chat, configurable transcription providers, API validation lab, hybrid RAG retrieval, and manual knowledge sync.
- AI 与工具：悬浮多模型聊天、可切换转写 provider、API 校验实验台、混合检索 RAG 与手动知识同步。

## Product Model / 当前产品模型

- Readers do not need an account to browse the site.
- 读者浏览站点不需要注册或登录。
- Public registration is closed. `/register` is now an informational page.
- 公共注册入口已关闭，`/register` 现在只是说明页。
- Only the site administrator can sign in.
- 只有站点管理员可以登录。
- Comments are open to guests. Guest name is required, guest email is optional and kept private.
- 评论对游客开放，游客昵称必填，邮箱可选且不公开。
- Private workspace routes such as `/account`, `/account/notifications`, and `/papers/library` are reserved for the signed-in admin.
- `/account`、`/account/notifications`、`/papers/library` 这类私有工作台路由只保留给已登录管理员。

## Tech Stack / 技术栈

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL
- Custom session auth with HttpOnly cookies
- Zod validation
- Nodemailer-based email delivery
- Docker / Docker Compose
- GitHub Actions for CI/CD and scheduled jobs

## Quick Start / 快速开始

1. Copy `.env.example` to `.env`.
2. Fill in database, app URL, session secret, and admin credentials.
3. Install dependencies: `npm ci`
4. Sync Prisma schema: `npm run db:push`
5. Bootstrap the admin account and base site profile: `npm run db:bootstrap`
6. Optional local sample content: `npm run db:seed:demo`
7. Start local development: `npm run dev`

本地首次启动推荐顺序：

1. 复制 `.env.example` 为 `.env`
2. 填好数据库、站点地址、会话密钥与管理员账号
3. 安装依赖：`npm ci`
4. 同步 Prisma 结构：`npm run db:push`
5. 初始化管理员账号和站点基础资料：`npm run db:bootstrap`
6. 如需本地演示内容，再执行：`npm run db:seed:demo`
7. 启动开发环境：`npm run dev`

## Common Commands / 常用命令

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:migrate:deploy`
- `npm run db:bootstrap`
- `npm run db:seed`
- `npm run db:seed:demo`
- `npm run db:studio`
- `npm run content:sync`
- `npm run content:watch`
- `npm run papers:sync`
- `npm run digest:generate`
- `npm run rag:sync`

## Route Highlights / 主要路由

Public routes / 前台公开路由：

- `/`
- `/blog`, `/blog/[slug]`
- `/notes`, `/notes/[slug]`
- `/journal`
- `/gallery`, `/gallery/[slug]`
- `/series`, `/series/[slug]`
- `/archive`
- `/tags`, `/tags/[tag]`
- `/categories`, `/categories/[category]`
- `/papers`
- `/digest`, `/digest/[slug]`
- `/search`
- `/tools`

Admin sign-in and private workspace / 管理员登录与私有工作台：

- `/login`
- `/register` (registration closed info page)
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/account`
- `/account/notifications`
- `/papers/library`

Admin routes / 后台管理路由：

- `/admin`
- `/admin/posts`, `/admin/notes`, `/admin/journal`
- `/admin/gallery`
- `/admin/comments`, `/admin/comments/rules`
- `/admin/users`, `/admin/audit`
- `/admin/profile`, `/admin/providers`
- `/admin/papers`, `/admin/digests`
- `/admin/series`
- `/admin/rag`
- `/admin/analytics`
- `/admin/exports`

## Current Scope / 当前版本能力边界

This repository is no longer just a blog shell. It already behaves like a compact publishing platform:

- public publishing and discovery
- guest comments with moderation and anti-spam
- admin-only authentication and account recovery
- scheduled publishing and revision restore
- private research workflow for the admin
- AI provider management, chat, transcription, and RAG operations

这个仓库已经不只是一个“博客外壳”，而是一套小型内容平台：

- 前台公开发布与内容发现
- 带审核和反垃圾的游客评论
- 仅管理员登录与账号恢复闭环
- 定时发布与修订恢复
- 管理员私有研究工作流
- 模型管理、聊天、转写与 RAG 运维能力

## Documentation Map / 文档导航

Core product docs / 核心产品文档：

- [docs/feature-overview.md](./docs/feature-overview.md)
- [docs/feature-overview.zh-CN.md](./docs/feature-overview.zh-CN.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/architecture.zh-CN.md](./docs/architecture.zh-CN.md)
- [docs/routes-and-apis.md](./docs/routes-and-apis.md)
- [docs/routes-and-apis.zh-CN.md](./docs/routes-and-apis.zh-CN.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/deployment.zh-CN.md](./docs/deployment.zh-CN.md)
- [docs/github-release-workflow.md](./docs/github-release-workflow.md)
- [docs/github-release-workflow.zh-CN.md](./docs/github-release-workflow.zh-CN.md)

Content and workflow docs / 内容与工作流文档：

- [docs/content-update-workflow.md](./docs/content-update-workflow.md)
- [docs/content-update-workflow.zh-CN.md](./docs/content-update-workflow.zh-CN.md)
- [docs/gallery-module.md](./docs/gallery-module.md)
- [docs/gallery-module.zh-CN.md](./docs/gallery-module.zh-CN.md)
- [docs/notes-sync.md](./docs/notes-sync.md)
- [docs/notes-sync.zh-CN.md](./docs/notes-sync.zh-CN.md)
- [docs/papers-operations.md](./docs/papers-operations.md)
- [docs/papers-operations.zh-CN.md](./docs/papers-operations.zh-CN.md)

RAG and AI docs / RAG 与 AI 文档：

- [docs/rag-v1.md](./docs/rag-v1.md)
- [docs/rag-v1.zh-CN.md](./docs/rag-v1.zh-CN.md)
- [docs/rag-v2.md](./docs/rag-v2.md)
- [docs/rag-v2.zh-CN.md](./docs/rag-v2.zh-CN.md)

Background and operations docs / 背景学习与运维文档：

- [docs/tech-stack-and-learning.md](./docs/tech-stack-and-learning.md)
- [docs/tech-stack-and-learning.zh-CN.md](./docs/tech-stack-and-learning.zh-CN.md)
- [docs/deployment-alicloud.md](./docs/deployment-alicloud.md)
- [docs/deployment-alicloud.zh-CN.md](./docs/deployment-alicloud.zh-CN.md)

## Seed Account / 默认种子账号

- Admin: `admin@example.com` / `ChangeMe123!`

`npm run db:bootstrap` only creates missing admin/profile records and will not overwrite an existing admin password, name, or site profile.

If you want local sample content, run `npm run db:seed:demo`.

If you change admin-related values in `.env` after bootstrap, update the existing admin/profile manually instead of rerunning the seed to overwrite them.

`npm run db:bootstrap` 只会补齐缺失的管理员和站点资料，不会覆盖已有管理员的密码、名称或站点 Profile。

如果需要本地演示内容，请执行 `npm run db:seed:demo`。

如果你在 bootstrap 之后修改了 `.env` 里的管理员信息，请通过后台或数据库手动更新现有管理员 / Profile，而不是重新跑种子去覆盖它们。

## Notes / 说明

- The repository currently contains many in-progress feature files. This is expected on the working branch.
- The most reliable health check is still `npm run db:push && npm run lint && npm run build`.
- For production, also plan backups, SMTP testing, scheduled job monitoring, and upload storage management.

- 当前分支里包含不少持续演进中的功能文件，这是正常状态。
- 当前最可靠的健康检查方式仍然是 `npm run db:push && npm run lint && npm run build`。
- 生产环境还应额外准备数据库备份、SMTP 验证、定时任务监控和上传资源管理。
