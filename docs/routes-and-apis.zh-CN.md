# 路由与接口说明

这份文档用于汇总当前版本的页面路由、HTTP API，以及主要 Server Action 分组。

## 1. 路由分组

当前项目可以分为五类路由：

- 前台发布与展示路由
- 账号与认证路由
- 后台管理路由
- 系统输出路由
- HTTP API 路由

## 2. 前台路由

### 首页与发现

- `/` - 首页
- `/archive` - 时间归档页
- `/search` - 站内搜索
- `/series` - 系列列表页
- `/series/[slug]` - 系列详情页
- `/tags` - 标签页
- `/tags/[tag]` - 标签详情页
- `/categories` - 分类页
- `/categories/[category]` - 分类详情页

### 内容页面

- `/blog` - 博客列表
- `/blog/[slug]` - 博客详情与评论
- `/notes` - 笔记列表
- `/notes/[slug]` - 笔记详情与反向链接
- `/journal` - 日志列表
- `/papers` - 公共论文页
- `/digest` - 周报列表
- `/digest/[slug]` - 周报详情
- `/tools` - AI 工具与 API 校验入口

### 登录用户页面

- `/papers/library` - 个人论文库
- `/account` - 账号设置页
- `/account/notifications` - 站内通知中心

## 3. 认证路由

- `/login` - 登录页
- `/register` - 注册页
- `/forgot-password` - 找回密码页
- `/reset-password` - 重置密码页
- `/verify-email` - 邮箱验证页

## 4. 后台管理路由

所有 `/admin/*` 路由都要求管理员会话。

### 总览与运维

- `/admin` - 后台总览
- `/admin/analytics` - 分析面板
- `/admin/audit` - 审计日志
- `/admin/exports` - 数据导出页
- `/admin/profile` - 站点资料编辑
- `/admin/rag` - RAG 管理台

### 审核与用户

- `/admin/comments` - 评论审核队列与历史
- `/admin/comments/rules` - 评论规则管理
- `/admin/users` - 用户列表
- `/admin/users/[id]` - 用户详情与控制

### 内容管理

- `/admin/posts`
- `/admin/posts/new`
- `/admin/posts/[id]`
- `/admin/notes`
- `/admin/notes/new`
- `/admin/notes/[id]`
- `/admin/journal`
- `/admin/journal/new`
- `/admin/journal/[id]`
- `/admin/digests`
- `/admin/series`
- `/admin/series/new`
- `/admin/series/[id]`

### AI 与研究管理

- `/admin/providers`
- `/admin/providers/new`
- `/admin/providers/[id]`
- `/admin/papers`
- `/admin/papers/new`
- `/admin/papers/[id]`

## 5. 系统输出路由

- `/feed.xml` - RSS 订阅
- `/feed.json` - JSON Feed
- `/robots.txt` - 爬虫规则
- `/sitemap.xml` - 站点地图

## 6. HTTP API 接口

## 6.1 认证接口

- `POST /api/auth/login` - 邮箱密码登录
- `POST /api/auth/logout` - 销毁当前会话
- `POST /api/auth/register` - 注册读者账号
- `POST /api/auth/forgot-password` - 发起找回密码邮件
- `POST /api/auth/reset-password` - 完成密码重置
- `POST /api/auth/resend-verification` - 重发验证邮件
- `POST /api/auth/verify-email` - 消费邮箱验证 token
- `POST /api/auth/2fa/verify` - 校验管理员 2FA 挑战
- `POST /api/auth/2fa/cancel` - 取消待完成的 2FA 挑战

## 6.2 应用接口

- `POST /api/chat` - 发送聊天请求，支持当前页上下文和 RAG
- `POST /api/chat/transcribe` - 通过所选转写 provider 执行语音转文本
- `POST /api/tools/validate` - 在工具页面校验 provider/API 请求配置
- `POST /api/telemetry/visit` - 记录页面访问数据
- `GET /api/admin/export` - 导出站点数据用于备份或迁移

## 7. 主要 Server Action 分组

很多关键写入流程没有暴露成公共 HTTP API，而是直接走 Server Actions。

### 认证与账号动作

- 会话创建与登出辅助逻辑
- 头像上传与移除
- 修改密码
- 2FA 开启、确认、取消、关闭
- 通知偏好更新

### 内容动作

- 文章创建与更新
- 笔记创建与更新
- 日志创建与更新
- 定时发布字段保存
- 修订历史恢复
- 评论创建、审核、删除

### 研究动作

- 论文主题 CRUD
- 论文库保存、更新、批注
- Digest 生成与归属更新
- RAG 同步动作

### 后台动作

- 用户角色与状态变更
- 禁言、封禁、恢复
- 评论规则 CRUD
- 导出与审计相关操作

## 8. 访问控制说明

- 前台内容路由默认可匿名访问
- 评论要求登录，且可选要求邮箱已验证
- `/papers/library`、`/account`、`/account/notifications` 要求登录
- `/admin/*` 要求 `ADMIN`
- 即便是 HTTP API，也有一部分接口要求登录或要求管理员权限

## 9. 建议联动阅读

- [architecture.zh-CN.md](./architecture.zh-CN.md)
- [feature-overview.zh-CN.md](./feature-overview.zh-CN.md)
- [deployment.zh-CN.md](./deployment.zh-CN.md)
- [rag-v2.zh-CN.md](./rag-v2.zh-CN.md)
