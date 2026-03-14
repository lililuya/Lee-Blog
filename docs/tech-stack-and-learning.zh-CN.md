# 项目技术栈、常用操作与学习路线（中文）

这份文档专门面向当前这个项目，目标有三件事：

1. 详细记录项目实际使用到的技术栈
2. 记录日常开发、内容维护、数据库、部署相关操作
3. 帮你判断：如果想“全看懂”这个项目，需要学习哪些知识，以及建议的学习顺序

这不是一份泛泛的前端 / 后端介绍，而是尽量贴合当前仓库已经实现的功能和代码结构来写。

## 1. 这个项目到底是什么

这是一个“前后端一体化”的全栈学术风格博客系统，目标不只是展示个人主页，而是把这些能力整合到一个长期可维护的产品里：

- 个人主页与研究介绍
- 博客文章发布
- Journal / 过程日志
- Notes / 常青知识卡片
- 评论系统与审核
- 登录、注册、会话管理
- 后台管理系统
- 论文抓取与论文收藏/批注
- 每周 Digest 生成
- 浮动聊天入口与多模型接入
- Markdown 同步工作流
- Docker 部署与 GitHub Actions CI/CD

你可以把它理解为：

- 一个博客站
- 一个内容管理后台
- 一个轻量研究工作台
- 一个可继续扩展 AI 工具的基础平台

## 2. 总体架构思路

这个项目不是传统意义上的“前端一个仓库 + 后端一个仓库”。

它采用的是：

- `Next.js App Router` 统一承载前端页面和服务端逻辑
- `Prisma + PostgreSQL` 统一做数据层
- `Server Actions + API Routes` 统一做写操作和接口能力
- `Docker + Nginx + GitHub Actions` 做部署和自动化

也就是说：

- 页面渲染、后台页面、登录鉴权、数据库访问、内容管理都在一个仓库里
- 类型、校验规则、权限逻辑可以跨前后端复用
- 对个人项目来说，维护成本更低

## 3. 技术栈总览

下面是这个项目真正用到的主要技术。

### 3.1 前端层

- `React 19`
- `Next.js 16 App Router`
- `TypeScript`
- `Tailwind CSS v4`
- `lucide-react`
- `react-markdown`
- `remark-gfm`
- `date-fns`
- `clsx`
- `tailwind-merge`

作用说明：

- `React`：负责组件化 UI
- `Next.js App Router`：负责路由、页面渲染、服务端组件、API、Server Actions
- `TypeScript`：提供类型约束
- `Tailwind CSS`：负责样式和布局
- `lucide-react`：图标库
- `react-markdown` + `remark-gfm`：渲染 Markdown 内容
- `date-fns`：日期格式化
- `clsx` + `tailwind-merge`：className 合并工具

### 3.2 服务端与业务层

- `Next.js Route Handlers` (`app/api/*`)
- `Next.js Server Actions` (`lib/actions/*`)
- `custom auth`（自定义会话认证）
- `jose`
- `bcryptjs`
- `zod`
- `fast-xml-parser`

作用说明：

- `Route Handlers`：提供 HTTP API，例如登录、聊天、访问统计
- `Server Actions`：处理后台表单提交、评论、用户管理、论文同步等写操作
- `jose`：处理 token / session 相关逻辑
- `bcryptjs`：密码加密与校验
- `zod`：表单校验与输入约束
- `fast-xml-parser`：解析 arXiv 返回的 Atom / XML 数据

### 3.3 数据层

- `PostgreSQL`
- `Prisma`
- `@prisma/client`
- `@prisma/adapter-pg`
- `pg`

作用说明：

- `PostgreSQL`：主数据库
- `Prisma`：ORM、schema 管理、类型安全数据库访问
- `pg`：底层 PostgreSQL 驱动
- `adapter-pg`：Prisma 7 对 PostgreSQL 驱动的适配

### 3.4 工具链与工程化

- `ESLint`
- `tsx`
- `dotenv`
- `Docker`
- `Docker Compose`
- `Nginx`
- `GitHub Actions`

作用说明：

- `ESLint`：代码规范检查
- `tsx`：直接运行 TypeScript 脚本，例如 `seed`、论文同步、Markdown 同步
- `dotenv`：读取环境变量
- `Docker / Compose`：开发和生产部署
- `Nginx`：HTTPS、反向代理、域名访问
- `GitHub Actions`：CI、自动部署、定时任务

## 4. 这个项目的核心目录是怎么分工的

### 4.1 `app/`

这里是 Next.js App Router 的核心目录。

主要包含：

- 公共页面：`/blog`、`/notes`、`/papers`、`/digest` 等
- 认证页面：`/login`、`/register`
- 后台页面：`/admin/*`
- API：`/api/*`
- Feed / Sitemap / Robots 等系统输出

你可以把它理解成：

- 页面入口层
- 路由层
- API 暴露层

### 4.2 `components/`

这里是可复用组件层，按职责划分为：

- `components/site`：前台组件
- `components/admin`：后台组件
- `components/forms`：各类表单
- `components/ui`：基础 UI 组件

如果你想改 UI，大概率会在这里。

### 4.3 `lib/`

这是项目最重要的“业务逻辑层”。

你会在这里看到：

- `auth.ts` / `auth-service.ts`：认证和会话
- `queries.ts`：读取数据
- `validators.ts`：Zod 校验
- `prisma.ts`：数据库连接
- `papers.ts`：论文抓取逻辑
- `digests.ts`：每周 Digest 生成逻辑
- `feeds.ts`：RSS / JSON Feed
- `llm.ts`：聊天模型请求相关逻辑
- `user-state.ts`：用户状态判断
- `visitor-analytics.ts`：匿名访问统计与区域汇总
- `lib/actions/*`：写操作入口

如果你想真正“读懂项目”，`lib/` 是你最需要重点看的地方。

### 4.4 `prisma/`

这里是数据库相关目录。

主要包括：

- `schema.prisma`：数据模型定义
- `seed.ts`：初始化数据和默认账号

### 4.5 `scripts/`

这里是项目的脚本目录。

当前最重要的几个脚本：

- `sync-daily-papers.ts`
- `generate-weekly-digest.ts`
- `sync-markdown-content.ts`
- `watch-markdown-content.ts`

这些脚本会通过 `tsx` 执行。

### 4.6 `content/`

这是 Markdown 内容目录。

主要包括：

- `content/blog`
- `content/notes`
- `content/journal`

这是内容创作层，不是页面渲染层。

### 4.7 `.github/workflows/`

这是自动化工作流目录。

当前主要包括：

- `ci.yml`
- `deploy.yml`
- `daily-papers.yml`
- `weekly-digest.yml`

## 5. 数据库里到底存了什么

当前 Prisma 模型大致可分成几类。

### 5.1 用户与权限

- `User`
- `Session`
- `AdminAuditLog`

作用：

- 用户账号
- 登录会话
- 后台敏感操作审计日志

### 5.2 站点内容

- `SiteProfile`
- `Post`
- `Note`
- `JournalEntry`
- `Comment`

作用：

- 个人介绍
- 博客文章
- 常青笔记
- 过程日志
- 评论与审核

### 5.3 AI 与模型

- `LlmProvider`

作用：

- 管理聊天模型提供商配置，例如 OpenAI-compatible、Anthropic 等

### 5.4 论文与研究流

- `PaperTopic`
- `DailyPaperEntry`
- `PaperLibraryItem`
- `PaperAnnotation`
- `WeeklyDigest`

作用：

- 论文主题与 arXiv 查询条件
- 每日抓取论文结果
- 用户收藏论文
- 用户批注
- 每周研究 Digest

### 5.5 站点运行态统计

- `SiteVisitor`

作用：

- 匿名化记录访问 IP 指纹
- 汇总页脚地图的区域分布
- 记录站点运行态访问信息

## 6. 核心运行流程是怎样的

### 6.1 页面读取流程

典型流程：

1. 页面进入 `app/*/page.tsx`
2. 页面调用 `lib/queries.ts`
3. `queries.ts` 通过 Prisma 查 PostgreSQL
4. 页面组件渲染数据

### 6.2 写操作流程

典型流程：

1. 表单来自 `components/forms/*`
2. 表单提交到 `lib/actions/*`
3. 在 action 中用 `zod` 校验
4. 用 Prisma 写数据库
5. 通过 `revalidatePath` 让页面更新
6. redirect 回相应页面

### 6.3 登录流程

典型流程：

1. 用户提交邮箱和密码
2. `app/api/auth/login` 或 `auth-actions.ts` 处理请求
3. 密码用 `bcryptjs` 校验
4. 生成会话记录写入 `Session`
5. 浏览器拿到 HttpOnly cookie
6. 服务端通过 cookie 识别当前用户

### 6.4 Markdown 同步流程

典型流程：

1. 你在 `content/*` 写 Markdown
2. 执行 `npm run content:sync`
3. 脚本读取 frontmatter 和正文
4. upsert 到数据库
5. 页面从数据库读取最新内容

### 6.5 Papers 抓取流程

典型流程：

1. 后台配置 `PaperTopic`
2. 执行 `npm run papers:sync`
3. `lib/papers.ts` 请求 arXiv API
4. XML 解析后写入 `DailyPaperEntry`
5. `/papers` 页面展示抓取结果
6. 用户可以把论文保存到个人库并批注

## 7. 常用命令总表

### 7.1 本地开发

```bash
npm run dev
```

启动开发服务器。

### 7.2 代码检查

```bash
npm run lint
```

执行 ESLint。

### 7.3 生产构建

```bash
npm run build
```

生成 Prisma Client 并构建 Next.js 项目。

### 7.4 数据库相关

```bash
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:studio
npm run db:seed
```

说明：

- `db:generate`：生成 Prisma Client
- `db:push`：把 Prisma schema 推到数据库
- `db:migrate`：开发态迁移命令
- `db:studio`：打开 Prisma Studio
- `db:seed`：初始化默认数据和管理员账号

### 7.5 内容与研究流

```bash
npm run content:sync
npm run content:watch
npm run papers:sync
npm run digest:generate
```

说明：

- `content:sync`：一次性同步 Markdown 内容到数据库
- `content:watch`：持续监听 Markdown 并同步
- `papers:sync`：抓取论文
- `digest:generate`：生成每周 Digest

## 8. 日常操作你最常会用到哪些

### 8.1 改页面标题、页脚、卡片文案

你通常只需要：

1. 修改 `app/` 或 `components/` 里的文件
2. 保存
3. 浏览器自动刷新或手动刷新

### 8.2 改 Markdown 内容

你通常需要：

```bash
npm run content:sync
```

如果你长期写 Markdown，建议再开一个终端：

```bash
npm run content:watch
```

### 8.3 改数据库结构

你通常需要：

```bash
npm run db:push
```

必要时再重启：

```bash
npm run dev
```

### 8.4 改默认管理员账号或种子数据

你通常需要：

```bash
npm run db:seed
```

### 8.5 改 `.env`

你需要：

- 停掉当前开发服务
- 重新执行 `npm run dev`

因为环境变量不会自动热更新。

## 9. 这个项目里哪些地方最值得你优先读

如果你想快速建立全局理解，我建议你按下面顺序读。

### 9.1 第一层：先建立全貌

建议先看：

- `README.md`
- `docs/architecture.md`
- `docs/routes-and-apis.zh-CN.md`

目标：

- 知道项目模块有哪些
- 知道路由结构和接口结构
- 知道为什么这是一个一体化全栈项目

### 9.2 第二层：看页面和组件

建议看：

- `app/layout.tsx`
- `app/page.tsx`
- `components/site/*`
- `components/forms/*`

目标：

- 知道页面怎么组装
- 知道前台和后台 UI 怎么拆组件
- 知道表单是怎么接到服务端的

### 9.3 第三层：看数据读取和写入

建议看：

- `lib/queries.ts`
- `lib/actions/*`
- `lib/validators.ts`
- `lib/prisma.ts`

目标：

- 知道数据从哪读
- 知道表单往哪写
- 知道类型和校验怎么做

### 9.4 第四层：看认证与权限

建议看：

- `lib/auth.ts`
- `lib/auth-service.ts`
- `proxy.ts`
- `lib/admin-user-management.ts`
- `lib/user-state.ts`

目标：

- 知道登录后怎么识别用户
- 知道管理员权限怎么限制
- 知道禁言、停用、删除这些规则怎么实现

### 9.5 第五层：看研究流和特色模块

建议看：

- `lib/papers.ts`
- `lib/paper-library.ts`
- `lib/paper-library-queries.ts`
- `lib/digests.ts`
- `lib/llm.ts`
- `lib/visitor-analytics.ts`

目标：

- 知道论文抓取怎么做
- 知道 Digest 怎么生成
- 知道聊天模型怎么接入
- 知道页脚统计怎么汇总

## 10. 如果想“全看懂”，你需要学习哪些知识

下面这部分最重要。

如果你想真正吃透这个项目，建议按知识层次来看。

### 10.1 Web 基础

你至少需要理解：

- 浏览器和服务器如何通信
- HTTP 请求 / 响应
- URL、域名、端口、DNS 的关系
- Cookie、Session 的基本概念
- JSON 是什么
- GET / POST 的差别

如果这部分不熟，后面看登录、API、部署都会吃力。

### 10.2 JavaScript 与 TypeScript

你需要掌握：

- 变量、函数、对象、数组
- 异步 `Promise` / `async-await`
- 模块导入导出
- TypeScript 的类型、接口、联合类型、泛型基础

这个项目大量代码都是 TypeScript，如果 TS 看不懂，阅读效率会很低。

### 10.3 React 基础

你需要掌握：

- 组件是什么
- props 是什么
- state 是什么
- 表单怎么处理
- 列表渲染、条件渲染
- `useEffect` 等基础 Hook

因为前台页面、后台表单、聊天浮窗本质上都在 React 组件里。

### 10.4 Next.js App Router

这是这个项目最关键的一层。

你需要理解：

- `app/` 目录路由
- Server Component 和 Client Component 的区别
- `page.tsx` / `layout.tsx`
- Route Handlers (`app/api/*`)
- metadata
- `revalidatePath`
- 重定向和服务端数据获取

如果你把 Next.js App Router 看懂，这个项目会一下子清晰很多。

### 10.5 Tailwind CSS 与布局

你需要理解：

- 常见 Tailwind 类名含义
- Flex 和 Grid
- 间距、圆角、边框、阴影
- 响应式断点
- 暗色模式样式覆盖

因为这个项目很多 UI 调整都直接写在 className 里。

### 10.6 Node.js 服务端基础

你需要理解：

- Node.js 是怎么运行 JavaScript / TypeScript 的
- 环境变量 `.env`
- 服务端和浏览器端代码的区别
- 文件系统、脚本执行、命令行

特别是这里有 `tsx` 脚本、seed、同步任务和部署命令。

### 10.7 PostgreSQL 与 SQL 基础

你需要理解：

- 表、行、列
- 主键、外键
- 索引
- 查询、插入、更新
- 唯一约束

这样你看 `schema.prisma` 才会真正理解这些模型是怎么关联起来的。

### 10.8 Prisma

你需要理解：

- `schema.prisma` 怎么定义模型
- `prisma.*.findMany / create / update / upsert`
- `db:push` 和 `migrate` 的区别
- seed 是什么

Prisma 是这个项目数据库层的核心。

### 10.9 认证与安全

你需要理解：

- 密码为什么要哈希
- Session 和 Cookie 是怎么工作的
- 管理员权限为什么要服务端校验
- 为什么不能相信前端传来的权限信息
- 为什么环境变量不能泄露

这个项目有登录、后台、用户权限和聊天模型密钥，这部分非常值得学。

### 10.10 Markdown 与内容系统

你需要理解：

- frontmatter 是什么
- Markdown 怎么转成结构化内容
- 为什么这个项目先同步进数据库而不是直接读文件

这对理解 `content/*` 工作流非常重要。

### 10.11 Docker、Linux、Nginx、部署

如果你想真正把这个项目独立部署上线，需要掌握：

- Linux 基本命令
- Docker 镜像和容器
- Docker Compose
- Nginx 反向代理
- 域名和 HTTPS 证书
- 环境变量管理

这部分在阿里云部署时非常关键。

### 10.12 Git 与 GitHub Actions

你需要理解：

- Git 提交、分支、拉取、推送
- GitHub Actions workflow 是什么
- CI 和 CD 的区别
- cron 定时任务怎么工作

这部分能帮你理解自动部署和定时抓取论文。

## 11. 推荐学习顺序

如果你不想东一榔头西一棒子，我建议这样学。

### 第一阶段：先能改 UI

目标：

- 能改标题
- 能改文案
- 能改布局

建议先学：

1. HTML / CSS / JavaScript 基础
2. React 基础
3. Tailwind CSS
4. Next.js App Router 的页面结构

### 第二阶段：能看懂数据流

目标：

- 看懂页面怎么拿数据
- 看懂表单怎么写数据库

建议学：

1. TypeScript
2. Next.js 服务端组件
3. Server Actions
4. Prisma 基础
5. PostgreSQL 基础

### 第三阶段：能自己改功能

目标：

- 新增后台字段
- 新增模块
- 改权限逻辑

建议学：

1. Zod 校验
2. 认证与 Session
3. 数据模型设计
4. 表单 + action + revalidate 全链路

### 第四阶段：能独立上线和维护

目标：

- 自己部署
- 自己排查线上问题
- 自己维护域名和证书

建议学：

1. Docker / Compose
2. Nginx
3. Linux 基础
4. GitHub Actions
5. 阿里云基础操作

## 12. 如果你现在就想开始读代码，最推荐的入口

我会给你一个最省力的入口顺序。

### 入口 1：看站点骨架

- `app/layout.tsx`
- `app/page.tsx`
- `components/site/site-header.tsx`
- `components/site/site-footer.tsx`

### 入口 2：看最常见的数据读取

- `lib/queries.ts`

### 入口 3：看最常见的写操作

- `lib/actions/content-actions.ts`
- `components/forms/post-form.tsx`
- `components/forms/note-form.tsx`

### 入口 4：看认证

- `lib/auth.ts`
- `lib/auth-service.ts`
- `app/api/auth/login/route.ts`
- `proxy.ts`

### 入口 5：看数据库模型

- `prisma/schema.prisma`
- `prisma/seed.ts`

### 入口 6：看特色能力

- `lib/papers.ts`
- `lib/digests.ts`
- `app/api/chat/route.ts`
- `lib/visitor-analytics.ts`

## 13. 建议你现在先掌握的最少知识集合

如果你目前不想全都学，只想“能自己改项目”，那最少掌握下面这些就足够了：

- React 基础
- Next.js App Router 基础
- TypeScript 基础
- Tailwind CSS 基础
- Prisma 的基本读写
- `npm run dev`
- `npm run content:sync`
- `npm run db:push`
- `.env` 改完要重启

掌握这几条，你就已经能改 70% 以上的日常内容了。

## 14. 进一步建议

如果你后面真的想把这个项目吃透，我建议你一边读代码，一边做小练习：

- 自己改首页标题和页脚文案
- 自己新增一个 Notes 字段
- 自己给 Papers 后台加一个额外提示文案
- 自己新增一个后台统计卡片
- 自己把一个模块从“只展示”改成“可编辑”

这样学习速度会比只看文档快很多。

## 15. 相关文档

你可以和下面这些文档一起配合看：

- `docs/architecture.md`
- `docs/routes-and-apis.zh-CN.md`
- `docs/content-update-workflow.zh-CN.md`
- `docs/notes-sync.zh-CN.md`
- `docs/papers-operations.zh-CN.md`
- `docs/deployment-alicloud.zh-CN.md`
