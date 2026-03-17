# GitHub 发布与工作流说明

这份文档是给这个仓库后续持续开发和发布时使用的实操手册，重点覆盖分支、PR、GitHub Actions、Secrets 和部署准备。

## 1. 当前项目建议的分支模型

这个项目现在比较适合使用：

- `main` 作为稳定分支
- 带 `codex/` 前缀的功能分支或里程碑分支

例如：

- `codex/rag`
- `codex/release-docs-refresh-20260318`

如果一次改动很大，完全可以把它当成一个“里程碑分支”，不必强行拆成很多很碎的小 commit。

## 2. 推荐本地开发流程

### 2.1 先更新稳定基线

```bash
git checkout main
git pull
```

### 2.2 创建工作分支

```bash
git switch -c codex/your-feature-name
```

### 2.3 本地开发并验证

至少执行：

```bash
npm run db:push
npm run lint
npm run build
```

如果这次还改了内容同步或 RAG 行为，建议额外执行：

```bash
npm run content:sync
npm run rag:sync
```

### 2.4 提交并推送

```bash
git add README.md app components docs lib prisma scripts package.json package-lock.json
git commit -m "feat: your milestone summary"
git push -u origin codex/your-feature-name
```

如果你确实需要把上传资源也纳入版本控制，再显式添加 `public/uploads`。默认不建议顺手一起提交。

## 3. PR 的 base 分支怎么选

规则很简单：

- 如果 `main` 里还没有上一版里程碑，就先针对上一版链路开 PR
- 如果 `main` 已经合入上一版，就直接对 `main` 开 PR

这样每个 PR 的 diff 会更清晰，也更容易 review。

## 4. 推荐 PR 流程

1. 把分支推到 GitHub
2. 在 GitHub 上创建 Pull Request
3. 观察 `CI` 工作流是否通过
4. 检查变更文件和 commit 摘要
5. CI 通过后再合并

PR 描述建议至少写清楚：

- 改了什么
- 本地怎么验证的
- 是否需要补环境变量、Secrets 或数据结构同步

## 5. 这个仓库里的 GitHub Actions 分工

当前主要 workflow：

- `CI`
  - 校验安装、数据库推送、seed、lint、build
- `Deploy`
  - 构建镜像、推到 GHCR，然后通过 SSH 到服务器部署
- `Daily Papers Sync`
  - 到服务器上触发每日论文同步
- `Weekly Digest`
  - 到服务器上触发每周 Digest 生成

## 6. GitHub 必须配置的 Secrets

路径：

`GitHub -> Settings -> Secrets and variables -> Actions`

部署和定时任务至少要配置这些：

- `SSH_HOST`
- `SSH_USERNAME`
- `SSH_PRIVATE_KEY`
- `SSH_PORT`
- `APP_ENV_FILE`
- `GHCR_PAT`

## 7. `APP_ENV_FILE` 是什么

`APP_ENV_FILE` 不是单个变量，而是整份生产环境 `.env` 的完整内容，以一个多行 secret 的形式保存在 GitHub。

里面至少应该包含：

- 数据库配置
- `APP_URL`
- `SESSION_SECRET`
- 初始化管理员账号
- SMTP 配置
- AI provider key
- 语音转写 provider 配置
- RAG embedding 配置

## 8. 服务器侧需要提前准备的内容

在 `Deploy` 能成功之前，服务器至少要准备好：

- 已安装 Docker
- 已安装 `docker compose`
- 当前 SSH 用户可以执行 Docker
- 目录 `/srv/scholar-blog-studio`
- 该目录下已经有 `docker-compose.prod.yml`

当前 deploy workflow 不是一套“从零开荒”的脚本，它默认这些基础条件已经满足。

## 9. 推荐首次部署顺序

1. 先配置 GitHub Secrets
2. 再准备服务器
3. 上传 `docker-compose.prod.yml`
4. 确认 SSH 用户有 Docker 权限
5. 合并到 `main` 或手动运行 `Deploy`
6. 验证首页、管理员登录、游客评论、评论审核和工具页
7. 手动跑一次 `Daily Papers Sync`
8. 如果需要，再手动跑一次 `Weekly Digest`

## 10. 如果 Actions 失败，怎么快速判断

### `CI` 失败

通常说明：

- 安装失败
- Prisma 结构或 `db:push` 失败
- seed 失败
- lint 失败
- build 失败

这一般是仓库代码或项目配置问题，不是 GitHub Secret 缺失。

### `Deploy` 失败

通常说明：

- 缺少 `SSH_*` secrets
- 缺少 `APP_ENV_FILE`
- 缺少 `GHCR_PAT`
- 服务器没有 `docker-compose.prod.yml`
- 服务器用户没有 Docker 权限

### `Daily Papers Sync` / `Weekly Digest` 失败

通常说明：

- SSH 或服务器配置还没准备好
- Deploy 其实还没成功过
- 远端 compose / app 环境还不可用

## 11. 建议长期固定流程

对这个项目来说，比较稳妥的长期流程就是：

1. 本地开发
2. 本地验证
3. 推功能分支
4. 开 PR
5. 等 CI 通过
6. 合并到 `main`
7. 让 Deploy 自动执行
8. 发布后检查管理员登录和评论审核链路
9. 观察定时任务

## 12. 相关文档

- [deployment.zh-CN.md](./deployment.zh-CN.md)
- [deployment.md](./deployment.md)
- [routes-and-apis.zh-CN.md](./routes-and-apis.zh-CN.md)
