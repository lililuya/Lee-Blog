# 内容修改与刷新说明（中文）

这份文档专门面向当前这个项目，说明你修改不同类型内容之后，应该执行什么操作、是否需要刷新浏览器、是否需要重启开发服务器，以及在生产环境里应该怎么更新。

如果你以后经常自己改标题、页脚文案、文章内容、Markdown 笔记、数据库结构或者 `.env`，这份文档可以当成日常速查表。

## 1. 一句话速查表

| 你改的内容类型 | 常见文件或入口 | 改完要做什么 | 是否要刷新浏览器 | 是否要重启服务 |
| --- | --- | --- | --- | --- |
| 页面标题、普通文案、按钮文字、页脚内容 | `app/**/*.tsx`、`components/**/*.tsx` | 保存文件 | 通常自动刷新，必要时手动 `F5` | 不需要 |
| 样式、颜色、布局 | `app/globals.css`、组件 className | 保存文件 | 通常自动刷新，必要时硬刷新 | 不需要 |
| 后台表单里改内容 | `/admin/*` 页面 | 点击保存 | 通常自动更新，必要时手动刷新 | 不需要 |
| Markdown 文章 / 笔记 / 日志 | `content/blog`、`content/notes`、`content/journal` | 运行 `npm run content:sync` 或 `npm run content:watch` | 需要 | 不需要 |
| 数据库结构 / Prisma 模型 | `prisma/schema.prisma` | 运行 `npm run db:push` | 需要 | 建议重启 `npm run dev` |
| 默认管理员 / 演示数据 | `prisma/seed.ts`、`.env` 中管理员信息 | 运行 `npm run db:seed` | 可能需要 | 一般不需要，必要时重启 |
| 环境变量 | `.env`、`.env.example` | 重启开发或生产服务 | 需要 | 必须重启 |
| API / Server Action / 查询逻辑 | `app/api`、`lib/actions`、`lib/queries` | 保存文件 | 刷新页面后测试 | 一般不需要 |
| GitHub Actions / 定时任务 | `.github/workflows/*.yml` | 提交并推送到远程仓库 | 不适用 | 不适用 |
| 生产环境代码 | ECS / Docker 容器 | 重新构建并重启容器 | 访问线上域名验证 | 需要重新部署 |

## 2. 本地开发时最常见的情况

如果你已经在本地运行了：

```bash
npm run dev
```

那么大多数前端类修改都支持热更新，也就是：

1. 保存文件
2. 浏览器自动刷新或局部更新
3. 如果没自动变，再按 `F5` 或 `Ctrl + R`

对这个项目来说，以下这些改动最常见，而且通常不需要额外命令：

- 首页标题、介绍文案
- 导航栏文字
- 页脚标题与说明
- 卡片标题、按钮文字
- 样式、颜色、间距、布局

典型文件例子：

- `app/page.tsx`
- `app/layout.tsx`
- `components/site/site-header.tsx`
- `components/site/site-footer.tsx`
- `app/globals.css`

## 3. 只改页面文案、标题、UI 布局时怎么做

适用范围：

- 页面标题
- 描述文案
- 按钮名称
- 卡片标题
- 页脚文案
- 联系方式展示文案
- 样式布局调整

常见文件：

- `app/**/*.tsx`
- `components/**/*.tsx`
- `app/globals.css`

操作方式：

1. 保存文件
2. 看浏览器是否自动更新
3. 如果没变，手动刷新浏览器

通常不需要执行任何额外命令。

### 3.1 如果改了还是没看到变化

优先按这个顺序检查：

1. 是否真的保存了文件
2. 浏览器是否卡了缓存，尝试 `Ctrl + Shift + R`
3. 终端里的 `npm run dev` 是否还在运行
4. 是否改错了文件位置

## 4. 改 Markdown 内容时怎么做

适用范围：

- 博客文章：`content/blog`
- 常青笔记：`content/notes`
- 日志：`content/journal`

注意：

这个项目不是直接在请求时从磁盘读取 Markdown，而是先把 Markdown 同步进数据库，再由页面从数据库读取。

所以你改完 Markdown 后，不能只刷新浏览器，还需要同步。

### 4.1 一次性同步

```bash
npm run content:sync
```

然后刷新浏览器。

### 4.2 持续监听

如果你经常改 Markdown，建议长期开一个终端运行：

```bash
npm run content:watch
```

这样保存 Markdown 后会自动同步，你再刷新浏览器就能看到内容变化。

### 4.3 适用例子

- 改 `content/notes/xxx.md` 的标题或正文
- 改 `content/blog/xxx.md` 的 frontmatter
- 改 `content/journal/xxx.md` 的摘要或内容

## 5. 在后台里改内容时怎么做

适用范围：

- 后台新建 / 编辑文章
- 后台新建 / 编辑 Notes
- 后台修改个人资料
- 后台修改论文主题
- 后台启用 / 停用模型提供商
- 后台审核评论
- 后台管理用户

操作方式通常是：

1. 打开后台页面
2. 提交保存
3. 系统会自动触发 `revalidatePath`
4. 如果前台页面没立刻变化，再手动刷新浏览器

一般不需要你额外执行命令。

## 6. 改数据库结构时怎么做

适用范围：

- 修改 `prisma/schema.prisma`
- 新增字段
- 新增模型
- 删除字段
- 调整表结构

这类改动不是单纯刷新浏览器能生效，必须同步数据库结构。

### 6.1 本地开发推荐操作

```bash
npm run db:push
```

然后建议：

1. 看终端是否报错
2. 如果项目类型提示不稳定，重启开发服务
3. 再刷新浏览器

### 6.2 如果你同时改了依赖此结构的页面

建议完整顺序是：

```bash
npm run db:push
npm run dev
```

如果 `npm run dev` 本来就在运行，就先停止再重新启动。

## 7. 改默认管理员、种子数据时怎么做

适用范围：

- 修改 `prisma/seed.ts`
- 修改 `.env` 里的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- 想恢复默认管理员账号

这类改动要重新执行种子脚本：

```bash
npm run db:seed
```

适合这些情况：

- 管理员账号密码想换掉
- 测试账号被误删 / 被停用后想恢复
- 新增默认演示数据

## 8. 改 `.env` 环境变量时怎么做

适用范围：

- `APP_URL`
- `SESSION_SECRET`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `ANTHROPIC_API_KEY`
- `SITE_LAUNCHED_AT`
- 其他任何 `.env` 中的值

这类改动不会被热更新自动加载。

### 8.1 本地开发

修改 `.env` 后，必须重启开发服务器：

```bash
npm run dev
```

如果当前已经开着，就先停止再重新执行。

### 8.2 生产环境

修改生产 `.env` 后，通常需要重新启动容器或重新部署。

## 9. 改 API、查询、Server Action 时怎么做

适用范围：

- `app/api/**`
- `lib/actions/**`
- `lib/queries.ts`
- 其他服务端逻辑

这类改动本地通常也会自动重新编译，但你必须在浏览器里重新触发对应页面或操作来验证。

例如：

- 改登录逻辑后，重新试一次登录
- 改评论提交逻辑后，重新发一条评论
- 改页脚统计 API 后，刷新任意页面触发一次访问埋点

一般不需要额外命令；如果终端状态异常，再重启 `npm run dev`。

## 10. 改网站标题或元信息时怎么做

适用范围：

- 页面 `title`
- 页面 `description`
- Open Graph 等 metadata

常见位置：

- `app/layout.tsx`
- 各路由页面里的 `metadata`

这类改动通常保存后也会更新，但浏览器标签页标题有时会被缓存。

建议操作：

1. 保存文件
2. 手动刷新浏览器
3. 如果标签没变化，用 `Ctrl + Shift + R` 强刷

## 11. 改样式后感觉“没变化”怎么办

适用范围：

- `globals.css`
- className 样式
- 深色模式样式
- 动画样式

如果你明明改了样式但页面没变化，按下面顺序处理：

1. 保存文件
2. 普通刷新 `F5`
3. 强制刷新 `Ctrl + Shift + R`
4. 看终端是否有编译错误
5. 确认是不是被别的样式覆盖了

## 12. 改定时任务、GitHub Actions 时怎么做

适用范围：

- `.github/workflows/daily-papers.yml`
- `.github/workflows/weekly-digest.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`

这类改动不会在本地浏览器里体现。

你需要：

1. 保存文件
2. 提交到 Git
3. 推送到远程仓库
4. 到 GitHub Actions 页面确认是否生效

例如你修改了 `daily-papers.yml` 的 cron 时间，仅仅本地刷新浏览器是没有意义的。

## 13. 生产环境改动后怎么更新

如果你是在阿里云服务器上部署的生产环境，分几种情况。

### 13.1 只改代码 / 页面 / 样式

如果你是服务器本地构建方案，常用更新流程：

```bash
cd /srv/scholar-blog-studio
git pull
docker build -t scholar-blog-studio:prod .
docker compose -f docker-compose.prod.yml up -d app
```

然后刷新线上域名页面。

### 13.2 改了 Prisma 数据库结构

```bash
cd /srv/scholar-blog-studio
git pull
docker build -t scholar-blog-studio:prod .
docker compose -f docker-compose.prod.yml run --rm app npm run db:push
docker compose -f docker-compose.prod.yml up -d app
```

### 13.3 改了种子数据或管理员默认账号

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:seed
```

### 13.4 改了 Markdown 内容并且文件就在服务器上

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run content:sync
```

然后刷新线上页面。

## 14. 适合你的实际操作习惯

如果你平时只是自己改标题和前端文案，最常用的其实就是下面这几种：

### 14.1 改页面标题 / 页脚 / 按钮文案

操作：

- 保存文件
- 刷新浏览器

### 14.2 改 Markdown 笔记

操作：

```bash
npm run content:sync
```

然后刷新浏览器。

### 14.3 改数据库结构

操作：

```bash
npm run db:push
```

必要时重启 `npm run dev`。

### 14.4 改 `.env`

操作：

- 重启开发服务器或生产容器

## 15. 推荐长期开的两个终端

为了让你平时维护更顺手，建议长期开两个终端：

### 终端 A

```bash
npm run dev
```

负责页面开发和热更新。

### 终端 B

如果你常写 Markdown：

```bash
npm run content:watch
```

这样你的写作和页面预览会顺很多。

## 16. 一个最实用的判断方式

你可以用这套简单判断：

- 改 UI 文案 / 标题 / 样式：保存后刷新浏览器
- 改 Markdown：先 `npm run content:sync`，再刷新
- 改 Prisma：先 `npm run db:push`
- 改管理员默认数据：`npm run db:seed`
- 改 `.env`：必须重启服务
- 改线上代码：必须重新部署

## 17. 相关文档

如果你还需要看更细的说明，可以继续参考：

- `docs/notes-sync.zh-CN.md`
- `docs/routes-and-apis.zh-CN.md`
- `docs/papers-operations.zh-CN.md`
- `docs/deployment-alicloud.zh-CN.md`
