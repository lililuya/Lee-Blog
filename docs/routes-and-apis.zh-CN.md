# 路由与接口说明

这份文档用于总结当前版本的页面路由、HTTP 接口，以及主要的 Server Action 分组。

## 1. 路由分组

当前应用主要可以分成五类路由：

- 前台公开发布路由
- 管理员登录与私有工作台路由
- 后台管理路由
- 系统输出路由
- HTTP API 路由

## 2. 前台公开路由

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
- `/notes` - Notes 列表
- `/notes/[slug]` - 带反向链接的 Note 详情
- `/journal` - Journal 列表
- `/gallery` - 图集列表
- `/gallery/[slug]` - 图集详情
- `/papers` - 公开 Papers 页面
- `/digest` - Digest 列表
- `/digest/[slug]` - Digest 详情
- `/tools` - AI 工具与请求校验页

## 3. 管理员登录与私有工作台路由

- `/login` - 管理员登录页
- `/register` - 注册关闭说明页
- `/forgot-password` - 找回密码
- `/reset-password` - 完成密码重置
- `/verify-email` - 管理员邮箱验证页
- `/account` - 管理员账号、安全与偏好设置页
- `/account/notifications` - 管理员私有站内提醒中心
- `/papers/library` - 管理员私有论文库

## 4. 后台路由

所有 `/admin/*` 路由都要求管理员会话。

### 总览与运维

- `/admin` - 后台首页
- `/admin/analytics` - 数据分析面板
- `/admin/audit` - 审计日志
- `/admin/exports` - 数据导出控制台
- `/admin/profile` - 站点资料编辑页
- `/admin/rag` - RAG 管理台

### 审核与管理

- `/admin/comments` - 评论审核队列与历史记录
- `/admin/comments/rules` - 评论规则管理
- `/admin/users` - 用户 / 会话列表（主要用于兼容历史记录与后台控制）
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

### AI 与研究后台

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

### 6.1 认证接口

- `POST /api/auth/login` - 使用邮箱和密码登录
- `POST /api/auth/logout` - 销毁当前会话
- `POST /api/auth/register` - 返回 `403`，因为公共注册已关闭
- `POST /api/auth/forgot-password` - 申请重置密码邮件
- `POST /api/auth/reset-password` - 完成密码重置
- `POST /api/auth/resend-verification` - 重新发送管理员验证邮件
- `POST /api/auth/verify-email` - 消费邮箱验证 token
- `POST /api/auth/2fa/verify` - 验证管理员 2FA 挑战
- `POST /api/auth/2fa/cancel` - 取消待处理的 2FA 挑战

### 6.2 应用接口

- `POST /api/chat` - 向选定 provider 发送聊天请求，并带页面上下文与 RAG 支持
- `POST /api/chat/transcribe` - 使用选定转写 provider 校验并执行语音转文字请求
- `POST /api/tools/validate` - 在工具页校验 provider / API 请求配置
- `POST /api/telemetry/visit` - 记录访问数据用于分析
- `POST /api/admin/gallery/assets` - 为图集后台表单上传图片资源
- `GET /api/admin/export` - 导出站点数据，用于备份或迁移

## 7. 主要 Server Action 分组

很多重要写操作并不是通过公开 HTTP API，而是通过 Server Actions 完成的。

### 认证与账号动作

- 会话创建与登出
- 头像上传与移除
- 修改密码
- 2FA 启用、确认、取消、关闭
- 通知偏好更新

### 内容动作

- 文章新建 / 更新
- Note 新建 / 更新
- Journal 新建 / 更新
- 图集新建 / 更新 / 删除
- 定时发布字段处理
- 修订历史恢复
- 游客 / 管理员评论创建
- 评论审核与删除

### 研究动作

- 论文主题 CRUD
- 论文库保存 / 更新 / 批注
- Digest 生成与系列归属
- RAG 同步动作

### 后台动作

- 评论规则 CRUD
- 导出与审计相关动作
- 保留后台里使用的用户 / 会话管理辅助动作

## 8. 访问模型说明

- 前台内容路由默认无需登录即可访问
- 评论可由游客提交，也可由管理员直接回复
- 游客评论要求填写公开昵称，邮箱可选
- `/register` 已不再是真实注册流程
- `/account`、`/account/notifications`、`/papers/library` 都属于管理员私有工作台
- `/admin/*` 需要 `ADMIN`
- 部分 API 虽然是 HTTP 接口，但仍然要求管理员权限

## 9. 推荐联动阅读的文档

- [architecture.zh-CN.md](./architecture.zh-CN.md)
- [feature-overview.zh-CN.md](./feature-overview.zh-CN.md)
- [deployment.zh-CN.md](./deployment.zh-CN.md)
- [gallery-module.zh-CN.md](./gallery-module.zh-CN.md)
- [rag-v2.zh-CN.md](./rag-v2.zh-CN.md)
