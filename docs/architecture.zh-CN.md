# 架构说明

这份文档描述的是 Scholar Blog Studio 当前这版“博客 + 研究工作台”一体化系统的实际架构。

## 1. 项目形态

这个项目采用的是“单仓库、前后端一体化”的全栈架构。

具体来说：

- 公共页面、后台页面、API、Server Actions 都放在同一个 Next.js 应用里
- Prisma 作为统一的数据访问层，服务所有业务模块
- 校验、权限和业务规则在一处定义，前后端复用
- 项目可以从“博客”自然扩展到“研究工作台”，不用过早拆成多套系统

之所以适合这样做，是因为当前产品已经同时具备：

- 内容发布
- 账号与安全
- 评论审核
- 论文采集
- 定时任务
- AI / RAG 能力
- 管理后台工具

## 2. 运行时分层

### 展示层

主要由以下部分组成：

- Next.js App Router 页面与布局
- React Server Components 承载数据型页面
- Client Components 承载交互表单、聊天组件和前端工具
- Tailwind CSS 负责样式

主要目录：

- `app/`
- `components/`

### 应用层

主要由以下部分组成：

- `lib/actions/*` 中的 Server Actions
- `lib/queries.ts` 及相关查询模块
- 认证、审核、通知、RAG 等领域服务

主要目录：

- `lib/actions/`
- `lib/`

### 数据层

主要由以下部分组成：

- `prisma/schema.prisma`
- PostgreSQL 数据库
- `prisma/seed.ts` 中的初始化数据

### 集成层

主要由以下部分组成：

- `app/api/*` 下的 Route Handlers
- 基于 Nodemailer 的邮件投递
- arXiv 同步脚本
- 外部 LLM 与语音转写 provider 适配

## 3. 当前主要业务域

现在这个仓库已经很明显地分成几组核心产品域。

### 内容发布域

- 博客文章
- 常青笔记
- 日志
- 内容系列
- 标签与分类
- 归档与相关文章推荐
- 修订历史与定时发布

### 账号、安全与审核域

- 注册与登录
- 邮箱验证
- 找回密码 / 重置密码 / 修改密码
- 自定义会话管理
- 管理员 2FA
- 登录限流与异常登录提醒
- 用户角色与状态管理
- 评论审核、反垃圾与规则管理
- 站内通知与邮件通知

### 研究工作台域

- 论文主题与每日 arXiv 同步
- 个人论文库
- 论文批注与阅读进度
- 每周 Digest 生成
- Citation / BibTeX 导出
- 笔记反向链接

### AI 与 RAG 域

- 聊天模型提供商管理
- 可配置语音转写提供商
- `/tools` 下的 API 校验实验室
- 全站悬浮聊天入口
- 可手动同步的混合检索 RAG
- RAG 管理台与知识同步状态面板

### 运维域

- 审计日志
- 数据导出
- 分析面板
- 部署与 GitHub Actions 自动化

## 4. 请求与写入流程

### 读取流程

1. `app/` 下的页面在服务端渲染
2. 页面调用 `lib/queries.ts` 或相关查询模块
3. Prisma 从 PostgreSQL 读取数据
4. 页面直接基于强类型数据完成渲染

### 写入流程

1. 表单提交到 Server Action 或 API Route
2. 先用 Zod 校验输入
3. 应用层执行权限与业务规则
4. Prisma 写入 PostgreSQL
5. 用 `revalidatePath()` 刷新受影响页面
6. 最后重定向或返回结构化响应

### 后台任务流程

当前这几个脚本既可以人工执行，也可以接 GitHub Actions 或 cron：

- `npm run papers:sync`
- `npm run digest:generate`
- `npm run content:sync`
- `npm run rag:sync`

它们的共同作用是把数据库状态和内容状态保持一致。

## 5. 安全模型

当前版本已经具备以下安全能力：

- 数据库会话 + HttpOnly Cookie
- 角色校验（`ADMIN`、`READER`）
- 状态校验（`ACTIVE`、`SUSPENDED`、`DELETED`）
- 后台路由保护
- 评论前邮箱验证
- 评论反垃圾与敏感词规则
- 认证相关限流
- 管理员 2FA
- 管理动作审计日志

这套安全强度已经明显高于普通静态博客，因为项目现在包含了 provider key、导出能力和评论审核后台。

## 6. 扩展性

当前架构特意保留了后续扩展空间，主要包括：

- 新 provider 适配器
- `/tools` 下继续增加 AI 工具
- 扩展 RAG 知识模型
- 增加更多导出与分析报表
- 引入对象存储或更丰富的媒体处理链路

## 7. 推荐阅读顺序

如果你准备继续维护这个仓库，建议按下面顺序阅读：

1. [feature-overview.zh-CN.md](./feature-overview.zh-CN.md)
2. [routes-and-apis.zh-CN.md](./routes-and-apis.zh-CN.md)
3. [deployment.zh-CN.md](./deployment.zh-CN.md)
4. [rag-v2.zh-CN.md](./rag-v2.zh-CN.md)
