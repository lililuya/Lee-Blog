# 内容修改与刷新说明

这份文档说明你在当前项目里修改不同类型内容之后，应该执行什么操作、是否需要刷新浏览器，以及是否需要重启服务。

## 1. 一句话速查表

| 你改的内容类型 | 常见文件或入口 | 改完要做什么 | 是否要刷新浏览器 | 是否要重启服务 |
| --- | --- | --- | --- | --- |
| 页面标题、普通文案、按钮文字、页脚内容 | `app/**/*.tsx`、`components/**/*.tsx` | 保存文件 | 通常自动刷新，必要时手动 `F5` | 不需要 |
| 样式、颜色、布局 | `app/globals.css`、组件 className | 保存文件 | 通常自动刷新，必要时硬刷新 | 不需要 |
| 后台表单里改内容 | `/admin/*` 页面 | 点击保存 | 通常自动更新，必要时手动刷新 | 不需要 |
| Markdown 文章 / 笔记 / 日志 | `content/blog`、`content/notes`、`content/journal` | 运行 `npm run content:sync` 或 `npm run content:watch` | 需要 | 不需要 |
| 数据库结构 / Prisma 模型 | `prisma/schema.prisma` | 运行 `npm run db:push` | 需要 | 建议重启 `npm run dev` |
| 初始化管理员 / 可选演示数据 | `prisma/seed.ts`、`.env` 中管理员信息 | 运行 `npm run db:bootstrap` 或 `npm run db:seed:demo` | 可能需要 | 视情况而定 |
| 环境变量 | `.env`、`.env.example` | 重启开发或生产服务 | 需要 | 必须重启 |
| API / Server Action / 查询逻辑 | `app/api`、`lib/actions`、`lib/queries` | 保存文件后重新走一遍对应流程 | 通常需要 | 一般不需要 |

如果是在已初始化过的数据库里修改 `ADMIN_*`，`db:bootstrap` 不会覆盖现有管理员记录，这时请通过后台或数据库手动更新。

## 2. 本地开发时最常见的情况

如果你已经在本地运行了：

```bash
npm run dev
```

那么大多数前端类修改都支持热更新，也就是：

1. 保存文件
2. 浏览器自动刷新或局部更新
3. 如果没自动变，再按 `F5` 或 `Ctrl + R`

最常见且通常不需要额外命令的改动包括：

- 首页标题、介绍文案
- 导航栏文字
- 页脚标题与说明
- 卡片标题、按钮文字
- 样式、颜色、间距、布局

## 3. 只改页面文案、标题、UI 布局时怎么做

适用范围：

- 页面标题
- 描述文案
- 按钮名称
- 卡片标题
- 页脚文案
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

## 4. 改 Markdown 内容时怎么做

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

## 5. 在后台里改内容时怎么做

适用范围：

- 后台新建 / 编辑文章
- 后台新建 / 编辑 Notes
- 后台修改站点资料
- 后台修改论文主题
- 后台启用 / 停用模型提供商
- 后台审核评论

通常流程是：

1. 打开后台页面
2. 提交保存
3. 系统自动触发 `revalidatePath`
4. 如果前台页面没立刻变化，再手动刷新浏览器

## 6. 改数据库结构时怎么做

适用范围：

- 修改 `prisma/schema.prisma`
- 新增字段
- 新增模型
- 删除字段
- 调整表结构

推荐操作：

```bash
npm run db:push
```

然后建议：

1. 看终端是否报错
2. 如果类型提示或页面行为不稳定，重启开发服务
3. 再刷新浏览器

## 7. 改默认管理员、种子数据时怎么做

适用范围：

- 修改 `prisma/seed.ts`
- 修改 `.env` 里的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- 想恢复默认管理员账号

这类改动要重新执行：

```bash
npm run db:bootstrap
```

## 8. 改 `.env` 环境变量时怎么做

这类改动不会被热更新自动加载。

### 8.1 本地开发

修改 `.env` 后，必须重启开发服务器：

```bash
npm run dev
```

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

- 改管理员登录逻辑后，重新试一次 `/login`
- 改游客评论逻辑后，重新发一条游客评论
- 改评论审核逻辑后，去 `/admin/comments` 审一次评论
- 改站内提醒逻辑后，登录管理员并打开 `/account/notifications`

一般不需要额外命令；如果终端状态异常，再重启 `npm run dev`。

## 10. 改样式后感觉“没变化”怎么办

如果你明明改了样式但页面没变化，按下面顺序处理：

1. 保存文件
2. 普通刷新 `F5`
3. 强制刷新 `Ctrl + Shift + R`
4. 看终端是否有编译错误
5. 确认是不是被别的样式覆盖了

## 11. 改定时任务、GitHub Actions 时怎么做

适用范围：

- `.github/workflows/daily-papers.yml`
- `.github/workflows/weekly-digest.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`

这类改动不会在本地浏览器里体现，你需要：

1. 保存文件
2. 提交到 Git
3. 推送到远程仓库
4. 到 GitHub Actions 页面确认是否生效

## 12. 生产环境改动后怎么更新

### 12.1 只改代码 / 页面 / 样式

```bash
cd /srv/scholar-blog-studio
git pull
docker build -t scholar-blog-studio:prod .
docker compose -f docker-compose.prod.yml up -d app
```

### 12.2 改了 Prisma 数据库结构

```bash
cd /srv/scholar-blog-studio
git pull
docker build -t scholar-blog-studio:prod .
docker compose -f docker-compose.prod.yml run --rm app npm run db:push
docker compose -f docker-compose.prod.yml up -d app
```

### 12.3 改了种子数据或管理员默认账号

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:bootstrap
```

### 12.4 改了 Markdown 内容并且文件就在服务器上

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run content:sync
```

## 13. 一个最实用的判断方式

你可以用这套简单判断：

- 改 UI 文案 / 标题 / 样式：保存后刷新浏览器
- 改 Markdown：先 `npm run content:sync`，再刷新
- 改 Prisma：先 `npm run db:push`
- 初始化缺失管理员：`npm run db:bootstrap`
- 改 `.env`：必须重启服务
- 改线上代码：必须重新部署

## 14. 相关文档

- [notes-sync.zh-CN.md](./notes-sync.zh-CN.md)
- [routes-and-apis.zh-CN.md](./routes-and-apis.zh-CN.md)
- [papers-operations.zh-CN.md](./papers-operations.zh-CN.md)
- [deployment-alicloud.zh-CN.md](./deployment-alicloud.zh-CN.md)
