# 架构说明

这份文档描述的是 Scholar Blog Studio 当前这版系统的实际架构。

## 1. 项目形态

这个项目采用的是“单仓库、前后端一体化”的全栈架构。

具体来说：

- 前台页面、管理员私有页面、API、Server Actions 都在同一个 Next.js 应用里
- Prisma 作为统一的数据访问层，服务所有模块
- 校验、权限、审核与业务规则集中在一处，避免前后端重复实现
- 项目可以从博客自然扩展成研究工作台，而不用过早拆成多套系统

这套架构适合当前产品，是因为它已经同时包含：

- 公开内容发布
- 管理员身份与安全体系
- 评论审核链路
- 论文抓取与私有阅读工作流
- 定时任务
- AI / RAG 能力
- 内部后台工具

## 2. 运行时分层

### 展示层

主要由以下部分组成：

- Next.js App Router 页面与布局
- React Server Components 承载数据型页面
- Client Components 承载交互组件、表单与聊天组件
- Tailwind CSS 负责样式

主要目录：

- `app/`
- `components/`

### 应用层

主要由以下部分组成：

- `lib/actions/*` 中的 Server Actions
- `lib/queries.ts` 及相关查询模块
- 认证、审核、通知、上传、论文、分析、RAG 等领域服务

主要目录：

- `lib/actions/`
- `lib/`

### 数据层

主要由以下部分组成：

- `prisma/schema.prisma`
- PostgreSQL 数据库
- `prisma/seed.ts` 里的初始化逻辑

### 集成层

主要由以下部分组成：

- `app/api/*` 下的 Route Handlers
- 基于 Nodemailer 的邮件投递
- arXiv 同步脚本
- 外部 LLM 与语音转写 provider 适配

## 3. 当前主要业务域

### 内容发布与发现

- 博客文章
- Notes
- Journal
- 图集
- 内容系列
- 标签与分类
- 归档与相关文章推荐
- 修订历史与定时发布

### 管理员身份、安全与审核

- 仅管理员登录
- 管理员邮箱验证
- 找回密码 / 重置密码 / 修改密码
- 自定义会话管理
- 管理员专属 2FA
- 登录限流与异常登录提醒
- 评论审核、反垃圾与规则管理
- 管理员站内提醒与邮件通知

### 研究工作台

- 论文主题与每日 arXiv 同步
- 管理员私有论文库
- 论文批注与阅读进度
- Weekly Digest 生成
- Citation / BibTeX 导出
- Notes 反向链接

### AI 与 RAG

- 聊天模型提供商管理
- 可切换语音转写 provider
- `/tools` 下的 API 校验实验台
- 全站悬浮聊天入口
- 可手动同步的混合检索 RAG
- RAG 管理台与同步状态面板

### 运维域

- 审计日志
- 数据导出
- 分析面板
- 部署脚本与 GitHub Actions 自动化

## 4. 请求与写入流程

### 读取流程

1. `app/` 下的页面在服务端渲染
2. 页面调用 `lib/queries.ts` 或其他查询模块
3. Prisma 从 PostgreSQL 读取数据
4. 页面基于强类型数据完成渲染

### 写入流程

1. 表单提交到 Server Action 或 API Route
2. 先用 Zod 校验输入
3. 应用层执行权限与业务规则
4. Prisma 写入 PostgreSQL
5. 用 `revalidatePath()` 刷新受影响页面
6. 最后重定向或返回结构化响应

### 后台任务流程

当前这些脚本既可以人工执行，也可以接 GitHub Actions 或 cron：

- `npm run papers:sync`
- `npm run digest:generate`
- `npm run content:sync`
- `npm run rag:sync`

它们的共同作用是让数据库状态、公开页面和后台工具保持同步。

## 5. 安全模型

当前版本的安全模型主要建立在以下机制上：

- 数据库会话 + HttpOnly Cookie
- 运行时只接受 `ADMIN` 会话
- 后台路由保护
- 管理员邮箱验证与密码重置
- 管理员专属 2FA
- 登录限流与异常登录提醒
- 敏感操作审计日志

评论系统则采用另一套更适合博客场景的模型：

- 前台读者不需要登录
- 游客可以使用公开昵称和可选私有邮箱发表评论
- 反垃圾保护包括 honeypot、重复评论检测、限流和规则审核
- 可选的 IP 哈希指纹用于滥用控制，但不会在业务层暴露原始 IP

数据库里仍然保留 `ADMIN`、`READER` 这类简单角色枚举以兼容历史数据，但当前产品流程已经不再提供公开读者注册，也不会接受非管理员会话。

## 6. 可扩展性

当前架构刻意保留了后续扩展空间，主要包括：

- 新增 provider 适配器
- 在 `/tools` 下继续扩展 AI 工具
- 扩展 RAG 知识模型
- 增加更多导出与分析报表
- 引入对象存储或更完整的媒体处理链路

## 7. 推荐阅读顺序

如果你准备继续维护这个仓库，建议按下面顺序阅读：

1. [feature-overview.zh-CN.md](./feature-overview.zh-CN.md)
2. [routes-and-apis.zh-CN.md](./routes-and-apis.zh-CN.md)
3. [deployment.zh-CN.md](./deployment.zh-CN.md)
4. [rag-v2.zh-CN.md](./rag-v2.zh-CN.md)
