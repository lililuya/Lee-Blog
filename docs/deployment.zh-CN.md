# 部署与运维说明

这份文档记录的是 Scholar Blog Studio 当前版本推荐的部署方式与运维要点。

## 1. 推荐生产拓扑

比较实用的一套生产部署方案是：

- 一台 Linux 服务器或云主机
- Docker Engine + Docker Compose
- PostgreSQL
- Nginx 或 Caddy 作为反向代理
- GitHub Actions 负责 CI/CD 与定时任务
- 可选 GHCR 镜像仓库

这套方案的优点是简单、可控，而且已经足够支撑：

- 后台管理
- 论文与周报定时任务
- SMTP 邮件链路
- AI / RAG 功能

## 2. 环境变量分组

## 2.1 核心运行配置

最基础必须配置：

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 2.2 账号与安全

和安全相关的常见变量包括：

- `SESSION_SECRET`
- 用于验证邮件 / 找回密码的邮件配置
- 可选的 2FA 展示名相关变量

## 2.3 邮件投递

如果你要启用这些能力，就需要把 SMTP 配置完整：

- 邮箱验证
- 找回密码
- 评论生命周期邮件通知
- 新文章发布邮件通知

推荐上线前至少测试这几条链路：

1. 注册
2. 重发验证邮件
3. 找回密码
4. 评论审核邮件

## 2.4 AI 与 RAG

如果你启用了 AI 与 RAG，需要继续配置：

- 各聊天模型 provider 的 API key
- 语音转写 provider 的凭证
- RAG embedding provider 的相关变量

当你对内容做了较大改动后，记得执行：

```bash
npm run rag:sync
```

## 3. 本地开发启动

## 3.1 Node.js 方式

```bash
npm ci
npm run db:push
npm run db:seed
npm run dev
```

## 3.2 Docker Compose 方式

```bash
docker compose up -d db
docker compose up -d app
docker compose run --rm app npm run db:push
docker compose run --rm app npm run db:seed
```

## 4. 首次部署检查顺序

建议顺序如下：

1. 准备服务器和 Docker 环境
2. 放置生产 `.env`
3. 启动 PostgreSQL
4. 拉取或构建应用镜像
5. 执行 `npm run db:push`
6. 执行 `npm run db:seed`
7. 启动应用容器
8. 验证登录、后台和邮件链路
9. 验证定时任务

## 5. 定时任务

当前版本默认会依赖这些周期任务：

- 每日论文同步
- 每周 Digest 生成
- 内容大改后可选执行的 RAG 同步

这些任务可以通过以下任意方式运行：

- GitHub Actions
- 服务器 cron
- 你的云平台调度器

## 5.1 常用命令

```bash
npm run papers:sync
npm run digest:generate
npm run rag:sync
```

## 6. 每次发布后建议检查

每次部署完成后，至少验证下面这些点：

- 首页正常打开
- 登录和登出正常
- 后台总览可访问
- 博客详情页评论区正常
- `/tools` 页面能正常打开并校验请求
- `/account/notifications` 登录后可访问
- 访问统计能正常记录

## 7. 备份建议

最低限度至少备份：

- PostgreSQL 数据库
- `.env`
- `public/uploads` 下的上传资源

如果你后面长期使用这个站点，建议进一步加上：

- 数据库定时 dump
- 异机备份
- 定时任务失败告警

## 8. 相关文档

- [feature-overview.zh-CN.md](./feature-overview.zh-CN.md)
- [routes-and-apis.zh-CN.md](./routes-and-apis.zh-CN.md)
- [deployment-alicloud.zh-CN.md](./deployment-alicloud.zh-CN.md)
