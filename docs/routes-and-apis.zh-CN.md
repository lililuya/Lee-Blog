# 路由与接口说明

这份文档用于总结当前版本的页面路由、HTTP 接口，以及主要的 Server Action 分组。

## 1. 路由分组

当前应用主要可以分成五类路由：

- 前台发布路由
- 账号与认证路由
- 后台管理路由
- 系统输出路由
- HTTP API 路由

## 2. 前台发布路由

### 首页与内容发现

- `/` - 首页
- `/archive` - 时间归档
- `/search` - 全站搜索
- `/series` - 系列列表
- `/series/[slug]` - 系列详情
- `/tags` - 标签列表
- `/tags/[tag]` - 标签详情
- `/categories` - 分类列表
- `/categories/[category]` - 分类详情

### 内容页面

- `/blog` - 博客列表
- `/blog/[slug]` - 文章详情与评论
- `/notes` - 笔记列表
- `/notes/[slug]` - 带反向链接的笔记详情
- `/journal` - 日志列表
- `/gallery` - 图集列表
- `/gallery/[slug]` - 图集详情
- `/papers` - 公共 Papers 页面
- `/digest` - Digest 列表
- `/digest/[slug]` - Digest 详情
- `/tools` - AI 工具与请求校验入口

### 登录用户页面

- `/papers/library` - 个人论文库
- `/account` - 账号设置
- `/account/notifications` - 站内通知中心

## 3. 认证路由

- `/login` - 登录页
- `/register` - 注册页
- `/forgot-password` - 申请重置密码
- `/reset-password` - 完成密码重置
- `/verify-email` - 邮箱验证页

## 4. 后台路由

所有 `/admin/*` 路由都要求管理员会话。

### 总览与运营

- `/admin` - 后台首页
- `/admin/analytics` - 数据分析面板
- `/admin/audit` - 审计日志
- `/admin/exports` - 数据导出控制台
- `/admin/profile` - 站点主页信息编辑
- `/admin/rag` - RAG 管理台

### 审核与用户

- `/admin/comments` - 评论审核与历史记录
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
- `/admin/gallery`
- `/admin/gallery/new`
- `/admin/gallery/[id]`
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
- `/robots.txt` - 搜索引擎抓取规则
- `/sitemap.xml` - 自动生成的网站地图

## 6. HTTP API 接口

## 6.1 认证接口

- `POST /api/auth/login` - 使用邮箱和密码登录
- `POST /api/auth/logout` - 销毁当前会话
- `POST /api/auth/register` - 注册读者账号
- `POST /api/auth/forgot-password` - 申请密码重置邮件
- `POST /api/auth/reset-password` - 完成密码重置
- `POST /api/auth/resend-verification` - 重新发送验证邮件
- `POST /api/auth/verify-email` - 消费邮箱验证 token
- `POST /api/auth/2fa/verify` - 验证管理员 2FA 挑战
- `POST /api/auth/2fa/cancel` - 取消待处理的 2FA 挑战

## 6.2 应用接口

- `POST /api/chat` - 向选定 provider 发送聊天请求，并带页面上下文与 RAG 支持
- `POST /api/chat/transcribe` - 用选定转写 provider 校验并执行语音转文字请求
- `POST /api/tools/validate` - 在工具页校验 provider / API 请求配置
- `POST /api/telemetry/visit` - 记录访问数据用于分析
- `POST /api/admin/gallery/assets` - 为图集后台表单上传图片资产
- `GET /api/admin/export` - 导出站点数据，用于备份或迁移

## 7. 主要 Server Action 分组

很多重要的写操作并不是通过公开 HTTP API，而是通过 Server Actions 完成的。

### 认证与账号动作

- 会话创建与登出
- 头像上传与删除
- 修改密码
- 2FA 启用、确认、取消、关闭
- 通知偏好更新

### 内容动作

- 文章新建 / 更新
- 笔记新建 / 更新
- 日志新建 / 更新
- 图集新建 / 更新 / 删除
- 定时发布字段处理
- 修订历史恢复
- 评论创建、审核、删除

### 研究动作

- 论文主题 CRUD
- 论文库保存 / 更新 / 批注
- Digest 生成与系列归属
- RAG 同步动作

### 后台动作

- 用户角色与状态变更
- 禁言 / 封禁 / 恢复等动作
- 评论规则 CRUD
- 数据导出与审计相关动作

## 8. 访问模型说明

- 前台内容路由默认无需登录即可访问
- 评论需要登录，且可能额外要求邮箱已验证
- `/papers/library`、`/account`、`/account/notifications` 需要登录
- `/admin/*` 需要 `ADMIN`
- 部分 API 虽然是 HTTP 接口，但仍然要求登录或管理员权限

## 9. 推荐联动阅读的文档

- [architecture.md](./architecture.md)
- [feature-overview.md](./feature-overview.md)
- [deployment.md](./deployment.md)
- [gallery-module.md](./gallery-module.md)
- [rag-v2.md](./rag-v2.md)
