# 路由与接口说明

这份文档用于说明当前项目已经存在的页面路由、后台路由、HTTP API，以及项目内部使用的重要 Server Actions。

## 1. 路由分组概览

当前项目大致可以分为四类路由：

- 公共内容路由
- 认证相关路由
- 后台管理路由
- 系统输出路由

## 2. 公共路由

### 首页与内容页面

- `/`：首页
- `/blog`：博客列表页
- `/blog/[slug]`：博客详情页
- `/journal`：日志列表页
- `/notes`：常青笔记列表页
- `/notes/[slug]`：常青笔记详情页
- `/papers`：每日论文页
- `/papers/library`：登录用户的论文收藏库
- `/digest`：每周研究简报列表页
- `/digest/[slug]`：每周研究简报详情页
- `/search`：站内搜索页
- `/tools`：预留工具模块

### 认证页面

- `/login`：登录页
- `/register`：注册页

## 3. 后台管理路由

所有 `/admin/*` 路由都要求管理员会话。

### 总览与系统管理

- `/admin`：后台总览仪表盘
- `/admin/audit`：审计日志页
- `/admin/comments`：评论审核管理
- `/admin/users`：用户列表与权限管理
- `/admin/users/[id]`：用户详情页与操作页
- `/admin/profile`：首页个人资料编辑页

### 内容管理

- `/admin/posts`：博客文章列表
- `/admin/posts/new`：新建博客文章
- `/admin/posts/[id]`：编辑博客文章
- `/admin/journal`：日志列表
- `/admin/journal/new`：新建日志
- `/admin/journal/[id]`：编辑日志
- `/admin/notes`：常青笔记列表
- `/admin/notes/new`：新建常青笔记
- `/admin/notes/[id]`：编辑常青笔记
- `/admin/digests`：周报管理页

### 模型与论文管理

- `/admin/providers`：LLM 提供商列表
- `/admin/providers/new`：新建模型提供商
- `/admin/providers/[id]`：编辑模型提供商
- `/admin/papers`：论文主题列表
- `/admin/papers/new`：新建论文主题
- `/admin/papers/[id]`：编辑论文主题

## 4. 系统输出路由

- `/feed.xml`：RSS 订阅
- `/feed.json`：JSON Feed
- `/robots.txt`：搜索引擎规则
- `/sitemap.xml`：站点地图

## 5. 当前 HTTP API 接口

项目当前暴露的 HTTP API 主要位于 `app/api` 下。

## 5.1 `POST /api/auth/login`

用途：

- 使用邮箱和密码登录

请求体：

```json
{
  "email": "admin@example.com",
  "password": "ChangeMe123!"
}
```

成功返回示例：

```json
{
  "ok": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

失败返回示例：

```json
{
  "ok": false,
  "error": "Login failed."
}
```

补充说明：

- 登录成功后会创建会话 cookie
- 登录表单本身依赖的就是这套认证能力

## 5.2 `POST /api/auth/register`

用途：

- 注册新的普通读者账号

请求体：

```json
{
  "name": "Reader Demo",
  "email": "reader@example.com",
  "password": "ReaderDemo123!"
}
```

成功返回示例：

- HTTP 状态码为 `201`

```json
{
  "ok": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "READER",
    "status": "ACTIVE"
  }
}
```

失败返回示例：

```json
{
  "ok": false,
  "error": "Registration failed."
}
```

## 5.3 `POST /api/auth/logout`

用途：

- 注销当前登录会话

请求体：

- 无

成功返回示例：

```json
{
  "ok": true
}
```

## 5.4 `POST /api/chat`

用途：

- 右下角聊天浮窗向配置好的 LLM 提供商发起对话请求

访问要求：

- 必须登录后才能调用

请求体示例：

```json
{
  "providerSlug": "deepseek-chat",
  "messages": [
    { "role": "user", "content": "请概括一下 notes 模块。" }
  ]
}
```

支持的消息角色：

- `system`
- `user`
- `assistant`

成功返回示例：

```json
{
  "ok": true,
  "content": "...模型回复内容..."
}
```

常见失败返回：

```json
{
  "ok": false,
  "error": "Please sign in before using the chat widget."
}
```

```json
{
  "ok": false,
  "error": "Chat request failed."
}
```

补充说明：

- 模型提供商必须在后台启用
- `.env` 中对应的 API Key 环境变量必须存在且非空
- 前端只会展示“已启用且环境变量存在”的模型


## 5.5 `POST /api/telemetry/visit`

用途：

- 为页脚地图和运行态卡片记录匿名访问脉冲

访问要求：

- 公开接口
- 设计上只给站点自身前端同源调用

请求体示例：

```json
{
  "path": "/notes/rag-evaluation-checklist",
  "timezone": "Asia/Shanghai",
  "language": "zh-CN"
}
```

服务端实际记录内容：

- 哈希后的 IP 指纹，而不是原始 IP
- 基于代理头或浏览器时区推断出的区域分组
- 最近访问路径
- 语言和轻量访问计数

补充说明：

- 机器人 / 爬虫类 User-Agent 会被跳过
- 如果没有地理位置头信息，系统会退回到基于时区的区域聚合
- 这个接口服务的是页脚运行态展示，不是完整统计后台
## 6. Server Actions 说明

当前项目大量写操作并不是通过公开 REST API 暴露，而是通过 Next.js Server Actions 完成。

这意味着：

- 页面表单可以直接提交到服务端函数
- 这些动作属于项目内部接口
- 它们对维护很重要，但不建议当成公开第三方 API 使用

## 6.1 认证相关 Server Actions

文件位置：

- `lib/actions/auth-actions.ts`

当前动作包括：

- `loginAction(formData)`
- `registerAction(formData)`
- `logoutAction()`

使用位置：

- `/login`
- `/register`
- 顶部退出登录按钮

## 6.2 内容相关 Server Actions

文件位置：

- `lib/actions/content-actions.ts`

当前动作包括：

- `createPostAction`
- `updatePostAction`
- `deletePostAction`
- `createJournalAction`
- `updateJournalAction`
- `deleteJournalAction`
- `createNoteAction`
- `updateNoteAction`
- `deleteNoteAction`
- `saveProfileAction`
- `createProviderAction`
- `updateProviderAction`
- `deleteProviderAction`
- `moderateCommentAction`
- `createCommentAction`

权限概况：

- 文章、日志、笔记、主页资料、模型提供商、评论审核：管理员专用
- 评论提交：登录用户可用

博客文章表单关键字段：

- `title`
- `slug`
- `excerpt`
- `content`
- `category`
- `tags`
- `status`
- `featured`
- `coverImageUrl`
- `publishedAt`

日志表单关键字段：

- `title`
- `slug`
- `summary`
- `content`
- `mood`
- `status`
- `publishedAt`

笔记表单关键字段：

- `title`
- `slug`
- `summary`
- `content`
- `noteType`
- `tags`
- `status`
- `featured`
- `publishedAt`

评论提交关键字段：

- `postId`
- `postSlug`
- `content`

## 6.3 论文相关 Server Actions

文件位置：

- `lib/actions/paper-actions.ts`

管理员动作：

- `createPaperTopicAction`
- `updatePaperTopicAction`
- `deletePaperTopicAction`
- `syncAllPaperTopicsAction`
- `syncSinglePaperTopicAction`

登录用户动作：

- `savePaperToLibraryAction`
- `updatePaperLibraryStatusAction`
- `removePaperFromLibraryAction`
- `addPaperAnnotationAction`
- `deletePaperAnnotationAction`

论文主题关键字段：

- `name`
- `slug`
- `description`
- `query`
- `maxResults`
- `enabled`

论文收藏 / 阅读状态 / 批注相关字段：

- `arxivId`
- `title`
- `summary`
- `authors`
- `paperUrl`
- `pdfUrl`
- `primaryCategory`
- `topicName`
- `digestDate`
- `libraryItemId`
- `status`
- `annotationId`
- `quote`
- `redirectTo`

## 6.4 周报相关 Server Actions

文件位置：

- `lib/actions/digest-actions.ts`

当前动作包括：

- `generateWeeklyDigestAction`
- `deleteWeeklyDigestAction`

权限：

- 管理员专用

## 6.5 用户管理相关 Server Actions

文件位置：

- `lib/actions/user-actions.ts`

当前动作包括：

- `changeUserRoleAction`
- `muteUserAction`
- `unmuteUserAction`
- `suspendUserAction`
- `restoreUserAction`
- `deleteUserAction`
- `revokeUserSessionsAction`

关键字段：

- `userId`
- `role`
- `days`
- `reason`
- `redirectTo`

代码里已实现的安全规则：

- 管理员不能对自己执行破坏性权限操作
- 最后一个活跃管理员不能被降级、停用或删除
- 停用和删除会立即撤销该用户的活动会话

## 7. Notes 与 Markdown 同步关系

现在 `/notes` 模块支持两条写入路径：

- 后台管理页面 `/admin/notes`
- Markdown-first 工作流：`content/notes` + `npm run content:sync`

需要注意的行为：

- 前台笔记页面始终从数据库读取
- Markdown 同步按 `slug` 做 upsert
- 后台 CRUD 直接修改 `Note` 表中的记录
- 删除 Markdown 文件不会自动删除数据库里的对应记录

相关文档：

- `docs/notes-sync.md`
- `docs/notes-sync.zh-CN.md`
- `content/README.md`

## 8. 权限概览

公开可访问：

- 首页、博客、笔记、日志、论文、周报、搜索、Feed、登录、注册

登录用户可访问：

- 聊天浮窗
- 论文收藏库与批注
- 评论提交

管理员可访问：

- 所有 `/admin/*` 页面
- 内容 CRUD
- 评论审核
- 模型提供商管理
- 论文主题管理与同步
- 周报生成
- 用户权限管理与审计日志

## 9. 维护建议

以后每增加一个页面、接口或 Server Action，最好同步更新这份文档，这样文档和代码才能长期保持一致。

