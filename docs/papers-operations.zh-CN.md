# Papers 模块运维说明

这份文档专门说明 `/papers` 模块的主题词是在哪里配置的、每天抓多少论文是在哪里设置的、自动抓取时间怎么改，以及目前这套 Papers 系统在“精细化管理”方面已经做到什么程度。

## 1. 论文主题在哪里配置

论文主题通过后台页面管理：

- `/admin/papers`
- `/admin/papers/new`
- `/admin/papers/[id]`

每个主题最终都会存进 Prisma 的 `PaperTopic` 模型，字段包括：

- `name`：主题展示名称
- `slug`：主题内部标识
- `description`：主题说明
- `query`：arXiv 原始检索语句
- `maxResults`：每次同步时该主题最多抓取多少篇
- `enabled`：该主题是否参与每日自动同步

## 2. Papers 页面的关键词在哪儿配置

`Papers` 页面真正使用的“关键词”并不是写在某个固定配置文件里，而是配置在后台主题表单的 `arXiv Query` 字段中，也就是 `/admin/papers` 里的每个 topic。

也就是说：

- 你新增一个 topic，本质上就是新增一组 arXiv 查询规则
- 你修改 topic 的 `query`，本质上就是修改这个主题每天抓取论文时用的关键词条件

常见示例：

- `all:"large language model" AND cat:cs.CL`
- `all:"retrieval augmented generation"`
- `ti:"agent" AND cat:cs.AI`
- `cat:cs.LG AND all:"multimodal"`

这里使用的是 arXiv API 的原生查询语法，系统会把它直接传给 arXiv 的 `search_query` 参数。

相关实现位置：

- `components/forms/paper-topic-form.tsx`
- `lib/papers.ts`

## 3. 每天抓取多少篇 paper 在哪儿设置

每个主题每天抓取多少篇，是在后台 `/admin/papers` 的 `Daily Result Limit` 字段中设置的。

它对应数据库字段：

- `PaperTopic.maxResults`

当前系统行为：

- 每个 topic 每次同步最多抓 `maxResults` 篇
- `Sync All Topics` 会遍历所有 `enabled = true` 的 topic，逐个抓取
- 因此总抓取量 = 所有启用主题各自上限的总和

例如：

- 你有 4 个启用主题
- 每个主题 `maxResults = 8`
- 那么一次全量同步理论上最多会写入约 32 条 topic-paper 记录

当前校验范围：

- 最小值：`1`
- 最大值：`20`

也就是说现在后台单个 topic 最多只能配到 20 篇。这是代码里写死的限制，位置在：

- `lib/validators.ts`

如果你后面确实想要每个主题抓得更多，可以改这个上限，但从日常个人使用来说，`5` 到 `10` 一般更稳，也更容易筛选。

## 4. 每天定时抓取时间怎么设置

这一项目前不在后台页面里配置，而是在“部署层”配置。

也就是二选一：

- 配 GitHub Actions 定时任务
- 或者配服务器自己的 cron / 定时任务

### 4.1 GitHub Actions 定时

当前文件位置：

- `.github/workflows/daily-papers.yml`

当前 cron 配置是：

```yaml
schedule:
  - cron: "0 0 * * *"
```

要注意：GitHub Actions 的 cron 使用的是 `UTC` 时区。

所以当前这条配置实际表示：

- 每天 `00:00 UTC`
- 也就是每天 `08:00 Asia/Shanghai`

也就是说，你现在的 daily papers 自动抓取时间，实际已经是“北京时间每天早上 8 点”。

几个常用换算例子：

- `0 0 * * *`：北京时间 08:00
- `30 23 * * *`：北京时间 07:30
- `0 1 * * *`：北京时间 09:00
- `0 14 * * *`：北京时间 22:00

如果你想改时间，直接改 `.github/workflows/daily-papers.yml`，然后提交并推送到 GitHub 即可生效。

### 4.2 服务器 cron 定时

如果你不想依赖 GitHub Actions，也可以直接在服务器上配置定时任务。

执行命令：

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run papers:sync
```

Linux 服务器每天 08:00 执行的 cron 示例：

```cron
0 8 * * * cd /srv/scholar-blog-studio && docker compose -f docker-compose.prod.yml run --rm app npm run papers:sync
```

注意：

- 这个时间是否等于北京时间，要看你的服务器时区
- 如果服务器不是 `Asia/Shanghai`，需要先做时区换算，或者把服务器时区配置正确

## 5. 手动触发同步怎么做

你现在有三种手动同步方式：

- 在 `/admin/papers` 点击 `Sync All Topics`
- 在 `/admin/papers/[id]` 点击 `Sync This Topic Now`
- 在命令行执行 `npm run papers:sync`

适合手动同步的场景：

- 刚改完 query，想立即验证效果
- 刚调整了 `maxResults`
- 刚启用或禁用了一个 topic
- 想先本地测试，再交给自动任务运行

## 6. 论文的日期分桶逻辑

当前 Papers 模块内部使用的是 `Asia/Shanghai` 作为日期边界。

相关代码位置：

- `lib/papers.ts`

这意味着：

- 同一个“北京时间自然日”内同步到的论文，会归到同一个 `digestDate`
- 后面的周报生成也会沿用同样的本地时间逻辑

这点挺重要，因为它决定了你在 `/papers` 和 `/digest` 里看到的数据归档方式。

## 7. 目前 Papers 模块已经具备的精细管理能力

从个人研究博客的标准来看，现在这套 Papers 模块已经具备这些可管理能力：

- 按主题配置关键词
- 每个主题单独设置抓取上限
- 每个主题支持启用 / 停用
- 支持一键同步全部主题
- 支持单主题立即同步
- 后台能查看最近同步的论文结果
- 用户侧支持论文收藏、阅读状态、批注

如果你的用户量不大、主要是你自己和少数读者使用，这套能力已经能支撑比较稳定的日常管理。

## 8. 目前还不够“特别精确”的地方

如果从“更精细、更像运维后台”的角度看，现在还缺几块：

- 不能给每个主题单独设置不同的抓取时间
- 还没有后台页面直接改 cron 时间
- 还没有同步历史记录表和失败日志页
- 还没有“排除词 / 负关键词”表单化管理
- 多个 topic 命中同一篇 paper 时，缺少更高级的跨主题去重策略
- 定时任务失败后还没有告警机制

所以结论可以很明确：

- 作为“个人研究博客 + 每日论文流”来说，已经够用，而且可管理性不差
- 但如果你要的是“非常精细的运营控制台”，还可以继续往同步日志、调度中心、预览测试这些方向补强

## 9. 我建议的下一步优化优先级

如果你希望 Papers 模块更完善，我建议优先做这几项：

1. 同步历史与错误日志
2. 每个 topic 显示“上次同步时间 / 上次抓取数量”
3. 保存前先测试 query 的预览功能
4. 后台可配置时区与定时任务说明
5. 常用 arXiv 查询模板库

这样你后面维护 topic 会轻松很多。

## 10. 快速结论

如果你现在只想知道“去哪里改”：

- 改关键词：去 `/admin/papers` 修改每个 topic 的 `arXiv Query`
- 改每天抓多少篇：去 `/admin/papers` 修改 `Daily Result Limit`
- 改每天几点自动抓：改 `.github/workflows/daily-papers.yml` 里的 cron，或者改服务器 cron
