# Scholar Blog Studio

A self-managed full-stack academic blog, research workspace, and AI-ready publishing system built with `Next.js + TypeScript + Prisma + PostgreSQL`.

一个可自托管的全栈学术博客与研究工作台，基于 `Next.js + TypeScript + Prisma + PostgreSQL` 构建，面向长期内容运营、研究记录与 AI 能力扩展。

## Highlights / 版本亮点

- Publishing and discovery: blog posts, notes, journal entries, content series, archive, tags, categories, related posts, search, RSS, and JSON Feed.
- Visual publishing: standalone gallery albums with ordered images, captions, direct upload support, and public gallery pages.
- 发布与发现：博客、常青笔记、日志、内容系列、归档、标签、分类、相关文章、站内搜索、RSS 与 JSON Feed。

- Research workflow: daily arXiv topic sync, personal paper library, annotations, reading progress, backlinks, weekly digests, citation copy, and BibTeX export.
- 研究工作流：每日 arXiv 主题同步、个人论文库、批注、高亮与阅读进度、笔记反向链接、周报、引用文本复制与 BibTeX 导出。

- Accounts and community: registration, login, email verification, password reset/change, comment anti-spam, moderation rules, email notifications, and in-app notification center.
- 账号与互动：注册、登录、邮箱验证、找回/修改密码、评论限流与反垃圾、敏感词规则、邮件通知、站内通知中心。

- Admin and operations: admin console, audit log, user moderation, scheduled publishing, revision history, exports, analytics dashboard, provider management, and RAG admin console.
- 后台与运维：管理后台、审计日志、用户管理、定时发布、修订历史、数据导出、分析面板、模型提供商管理、RAG 管理台。

- AI and tooling: floating multi-provider chat, configurable speech-to-text providers, API validation lab, hybrid RAG retrieval, and manual knowledge sync.
- AI 与工具：悬浮多模型聊天、可切换语音转写提供商、API 校验实验室、混合检索 RAG、知识库手动同步。

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
5. Seed demo/admin data: `npm run db:seed`
6. Start local development: `npm run dev`

如果你是首次本地启动，推荐顺序就是：

1. 复制 `.env.example` 为 `.env`
2. 填好数据库、站点地址、会话密钥、管理员账号
3. 安装依赖：`npm ci`
4. 推送 Prisma 结构：`npm run db:push`
5. 初始化演示与管理员数据：`npm run db:seed`
6. 启动开发环境：`npm run dev`

## Common Commands / 常用命令

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:studio`
- `npm run content:sync`
- `npm run content:watch`
- `npm run papers:sync`
- `npm run digest:generate`
- `npm run rag:sync`

## Route Highlights / 主要路由

Public / 前台：

- `/`
- `/blog`, `/blog/[slug]`
- `/notes`, `/notes/[slug]`
- `/journal`
- `/series`, `/series/[slug]`
- `/archive`
- `/tags`, `/tags/[tag]`
- `/categories`, `/categories/[category]`
- `/papers`, `/papers/library`
- `/digest`, `/digest/[slug]`
- `/search`
- `/gallery`, `/gallery/[slug]`
- `/tools`
- `/account`, `/account/notifications`
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`

Admin / 后台：

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

## Current Product Scope / 当前版本能力边界

This repository is no longer only a blog shell. It already behaves like a small research publishing platform:

- public publishing and discovery
- admin CMS with revisions and scheduled release
- account lifecycle and security hardening
- comment moderation and notification loop
- research paper collection and digest generation
- AI provider management, chat, transcription, and RAG operations

这个仓库已经不只是“个人主页模板”，而是一个小型研究内容平台，覆盖：

- 内容发布与发现
- 带修订和定时发布的后台 CMS
- 完整账号闭环与安全增强
- 评论审核、通知与反垃圾
- 论文采集、管理与周报生成
- 模型管理、聊天、转写和 RAG 运维

## Documentation Map / 文档导航

Core product docs / 核心文档：

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

Content and research workflows / 内容与研究工作流：

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

Background learning docs / 背景学习文档：

- [docs/tech-stack-and-learning.md](./docs/tech-stack-and-learning.md)
- [docs/tech-stack-and-learning.zh-CN.md](./docs/tech-stack-and-learning.zh-CN.md)
- [docs/deployment-alicloud.md](./docs/deployment-alicloud.md)
- [docs/deployment-alicloud.zh-CN.md](./docs/deployment-alicloud.zh-CN.md)

## Seed Accounts / 默认种子账号

- Admin: `admin@example.com` / `ChangeMe123!`
- Reader: `reader@example.com` / `ReaderDemo123!`

If you change admin-related values in `.env`, run `npm run db:seed` again.

如果你修改了 `.env` 里的管理员相关配置，请重新执行一次 `npm run db:seed`。

## Notes / 说明

- The repository currently contains many in-progress feature files. This is expected for the current working branch.
- The most reliable status snapshot is `npm run db:push && npm run lint && npm run build`.
- For production, also plan backups, SMTP testing, and scheduled job monitoring.

- 当前分支包含较多正在推进中的功能文件，这是正常状态。
- 当前最可靠的版本健康检查方式仍然是：`npm run db:push && npm run lint && npm run build`。
- 如果要上生产，还需要同时准备数据库备份、SMTP 验证和定时任务监控。
