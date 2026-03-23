# 笔记同步指南

这份文档专门说明 `/notes` 模块的用途、Markdown 文件应该放在哪里、同步机制如何工作，以及后台 CRUD 管理是怎么和 Markdown 工作流共存的。

## 1. `/notes` 模块是做什么的

`/notes` 适合放“可长期复用”的知识内容，定位介于以下两者之间：

- `journal`：偏轻量、偏过程、偏阶段性的记录
- `blog`：偏完整、偏正式、偏长篇的文章

适合放在 `/notes` 的内容类型：

- 概念卡片
- 阅读摘记
- 方法总结
- 检查清单
- 参考片段
- 可复用提示词模板
- 评测模板

你可以把 `/notes` 理解为站点里的“常青知识层”。

## 2. 笔记文件应该放在哪里

请把笔记 Markdown 文件放在：

```text
content/notes/
```

当前会被忽略的文件：

- 文件名以 `_` 开头
- `README.md`

模板文件位置：

```text
content/notes/_template.md
```

推荐做法：

- 一篇笔记对应一个 `.md` 文件
- 文件名尽量和主题强相关
- 标题、文件名、slug 尽量保持一致，方便长期引用

## 3. 同步机制是怎么工作的

当前项目不是“请求来了就直接从磁盘读取 Markdown 并渲染页面”，而是采用“先导入数据库，再由网站读取数据库”的模式。

完整流程如下：

1. 你在 `content/notes` 中编写 Markdown
2. 同步脚本读取 frontmatter 和正文内容
3. 将内容 upsert 到 PostgreSQL 的 `Note` 表
4. 网站运行时从数据库里读取并展示

这样设计的原因：

- 与整个全栈博客的运行方式保持一致
- 搜索、feed、sitemap、后台管理都能基于同一份数据库记录工作
- Markdown 工作流和后台浏览器管理可以同时存在，而不需要维护两套独立渲染系统

## 4. frontmatter 参考

推荐最小写法：

```md
---
title: RAG 评测检查清单
slug: rag-evaluation-checklist
summary: 一个用于发布 RAG 功能前快速自查的简明笔记。
noteType: Checklist
tags: rag, evaluation, checklist
status: PUBLISHED
featured: false
publishedAt: 2026-03-12T08:10:00+08:00
---
```

支持字段如下：

- `title`：笔记标题
- `slug`：公开访问路径；如果不写，会根据文件名或标题自动生成
- `summary`：摘要，列表页、搜索页和 feed 会使用
- `noteType`：展示类型，例如 `Checklist`、`Method Note`、`Reading Note`
- `tags`：标签，可以写逗号分隔字符串，也可以写 YAML 数组
- `status`：支持 `DRAFT`、`PUBLISHED`、`ARCHIVED`
- `featured`：是否推荐显示，支持 `true` / `false`
- `publishedAt`：ISO 格式时间字符串

默认行为：

- 如果没有写 `summary`，系统会从正文中自动生成摘要
- 如果没有写 `noteType`，默认使用 `Knowledge Note`
- 如果状态是 `PUBLISHED` 但没有写 `publishedAt`，会使用同步时的当前时间

## 5. 一次性同步命令

执行：

```bash
npm run content:sync
```

它会做什么：

- 扫描 `content/blog`
- 扫描 `content/notes`
- 扫描 `content/journal`
- 将对应内容 upsert 到 PostgreSQL 中

典型输出示例：

```text
Synced 2 blog file(s), 3 note file(s), and 4 journal file(s).
```

## 6. 实时监听模式

执行：

```bash
npm run content:watch
```

它会做什么：

- 监听 `content/blog`
- 监听 `content/notes`
- 监听 `content/journal`
- 文件变化后自动重新同步

推荐工作流：

1. 开一个终端运行 `npm run content:watch`
2. 在 Markdown 编辑器里写笔记
3. 保存文件
4. 刷新浏览器
5. 到 `/notes` 查看结果

## 7. 新建一篇笔记的完整步骤

推荐流程：

1. 复制 `content/notes/_template.md`
2. 重命名为有意义的文件名，例如 `rag-evaluation-checklist.md`
3. 填写 frontmatter
4. 编写 Markdown 正文
5. 运行 `npm run content:sync`，或者提前开着 `npm run content:watch`
6. 打开 `/notes`
7. 再打开 `/notes/[slug]` 检查最终效果

## 8. 后台页面管理

现在 notes 也支持通过后台页面直接管理：

- `/admin/notes`
- `/admin/notes/new`
- `/admin/notes/[id]`

推荐分工：

- 如果你习惯 Obsidian、VS Code、Typora 这类写作工具，就继续用 Markdown-first
- 如果你想在浏览器里快速补改、发布、归档或删除，就用后台管理页面

这里要注意：

- 两种方式最终都写入同一张 `Note` 表
- Markdown 同步按 `slug` 做 upsert
- 后台 CRUD 直接按数据库 `id` 修改记录

## 9. 修改已有笔记时要注意什么

如果你修改 `content/notes` 中已有的 Markdown 文件，再执行同步，系统会基于 `slug` 做 upsert：

- `slug` 不变：更新原有数据库记录
- `slug` 改了：会被当成一篇新笔记创建

这意味着：

如果一篇笔记已经被站内链接、搜索、feed 或外部引用过，最好不要轻易改 `slug`。

## 10. 删除笔记时当前是什么行为

当前实现里：

- 删除 Markdown 文件，不会自动删除数据库里的旧笔记记录

原因是：

- 当前同步策略是 upsert，不是“磁盘和数据库完全对账式删除”

因此目前更安全的做法是：

- 把笔记状态改成 `ARCHIVED`
- 或直接在 `/admin/notes` 中删除
- 或手动删除数据库记录

## 11. `/notes` 相关公开路由

和笔记相关的页面路径有：

- `/notes`：笔记列表页
- `/notes/[slug]`：笔记详情页

相关系统输出：

- `/search`：站内搜索已包含已发布 notes
- `/feed.xml`：RSS 已包含已发布 notes
- `/feed.json`：JSON Feed 已包含已发布 notes
- `/sitemap.xml`：站点地图已包含已发布 note 链接

## 12. 数据库存储结构简介

笔记使用 Prisma 的 `Note` 模型存储。

核心字段包括：

- `title`
- `slug`
- `summary`
- `content`
- `noteType`
- `tags`
- `status`
- `featured`
- `publishedAt`
- `authorId`

Markdown 导入时的作者行为：

- 默认会关联到数据库中找到的第一个管理员账号

这意味着：

- 数据库里必须先有管理员账号
- 新项目初始化时建议先执行 `npm run db:bootstrap`
- 只有明确需要本地演示内容时，才执行 `npm run db:seed:demo`

## 13. 常见问题排查

### `npm run content:sync` 显示 `0 note file(s)`

请检查：

- 文件是否放在 `content/notes`
- 文件扩展名是否为 `.md`
- 文件名是否以 `_` 开头
- 当前目录里是否除了 `_template.md` 以外没有正式笔记

### 笔记没有出现在 `/notes`

请检查：

- `status` 是否为 `PUBLISHED`
- 同步命令是否执行成功
- 数据库连接是否正常
- slug 是否和你预期一致

### 页面 URL 不对

请检查：

- frontmatter 中的 `slug`
- 如果没有写 `slug`，系统是否根据文件名或标题生成了不同结果

### 同步时报“没有管理员”相关错误

执行：

```bash
npm run db:bootstrap
```

## 14. 推荐的笔记分类方式

为了后续笔记越来越多时仍然好管理，建议 `noteType` 控制在一组相对稳定的分类中，例如：

- `Knowledge Note`
- `Checklist`
- `Method Note`
- `Reading Note`
- `Prompt Pattern`
- `Reference`

## 15. 推荐编辑器

这个工作流比较适合以下工具：

- Obsidian
- VS Code
- Typora
- Cursor
- Windsurf

## 16. 简单使用准则

可以这样理解：

- `journal` 用来记录过程
- `notes` 用来沉淀长期知识
- `blog` 用来发布整理后的正式内容
