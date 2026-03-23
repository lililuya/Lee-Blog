# Tools 站外导航维护说明

这份文档说明如何给 [`/tools`](../app/tools/page.tsx) 页面新增、修改、删除站外导航链接。

当前 `tools` 页面已经被整理成“常用网址导航”页面，核心数据都集中放在：

- [`lib/tool-links.ts`](../lib/tool-links.ts)

页面渲染入口与目录组件分别在：

- [`app/tools/page.tsx`](../app/tools/page.tsx)
- [`components/site/external-links-directory.tsx`](../components/site/external-links-directory.tsx)

## 1. 最常见的操作：新增一个网站

绝大多数情况下，你只需要改 [`lib/tool-links.ts`](../lib/tool-links.ts) 里的 `externalLinkEntries` 数组。

新增一项时，按下面格式追加一个对象：

```ts
{
  id: "v0",
  categoryId: "design",
  title: "v0",
  href: "https://v0.dev/",
  description: "适合快速生成界面草图、组件结构和页面灵感。",
  tags: ["UI", "原型", "前端"],
  featured: true,
}
```

保存后刷新 `/tools` 页面，就会出现在对应分类里。

## 2. 每个字段是什么意思

`externalLinkEntries` 中每个对象都遵循这个结构：

```ts
type ExternalLinkEntry = {
  id: string;
  categoryId: ExternalLinkCategoryId;
  title: string;
  href: string;
  description: string;
  tags: string[];
  featured?: boolean;
  iconUrl?: string;
};
```

字段说明：

- `id`
  - 必填。
  - 必须唯一，建议使用简短、稳定、可读的英文标识。
  - 不要和已有项重复。

- `categoryId`
  - 必填。
  - 决定这个网站显示在哪个分类下。
  - 当前可用值见下文“新增分类”前的现有分类列表。

- `title`
  - 必填。
  - 页面上展示的网站名称。

- `href`
  - 必填。
  - 建议写完整的 `https://...` 地址。
  - 不要省略协议头。

- `description`
  - 必填。
  - 用一句话说明这个网站是干什么的，重点写“我为什么会打开它”。

- `tags`
  - 必填。
  - 用来搜索和快速识别用途。
  - 建议放 2 到 5 个关键词。

- `featured`
  - 可选。
  - 设为 `true` 后，卡片上会显示“常用”标记。

- `iconUrl`
  - 可选。
  - 如果不填，系统会默认尝试读取该网站的 `/favicon.ico`。
  - 如果目标站 favicon 不稳定、被防盗链、或者你想换成更好的图标，可以手动填这个字段。

## 3. 当前已有分类

当前分类定义在 [`lib/tool-links.ts`](../lib/tool-links.ts) 的 `externalLinkCategories`：

```ts
type ExternalLinkCategoryId =
  | "research"
  | "models"
  | "development"
  | "knowledge"
  | "design";
```

对应中文含义：

- `research`：论文研究
- `models`：模型平台
- `development`：开发部署
- `knowledge`：写作知识库
- `design`：设计素材

如果你只是新增网址，直接把 `categoryId` 设成这些值之一即可。

## 4. 如何新增一个分类

如果现有分类不够用，可以在 [`lib/tool-links.ts`](../lib/tool-links.ts) 中同时修改两处。

### 第一步：扩展分类 ID

把新的分类 ID 加到 `ExternalLinkCategoryId` 里，例如新增一个 `media`：

```ts
export type ExternalLinkCategoryId =
  | "research"
  | "models"
  | "development"
  | "knowledge"
  | "design"
  | "media";
```

### 第二步：在分类数组中添加分类定义

```ts
{
  id: "media",
  label: "媒体工具",
  description: "视频、音频、转码和素材处理相关网站。",
}
```

### 第三步：给这个分类绑定图标

还需要去 [`components/site/external-links-directory.tsx`](../components/site/external-links-directory.tsx) 里的 `categoryIconMap` 添加图标映射：

```ts
const categoryIconMap: Record<ExternalLinkCategoryId, LucideIcon> = {
  research: GraduationCap,
  models: BrainCircuit,
  development: Blocks,
  knowledge: NotebookTabs,
  design: Palette,
  media: Film,
};
```

如果少了这一步，TypeScript 会报错。

## 5. 图标是怎么显示的

[`components/site/external-links-directory.tsx`](../components/site/external-links-directory.tsx) 的逻辑是：

1. 如果填写了 `iconUrl`，优先使用 `iconUrl`
2. 否则尝试读取目标网站的 `/favicon.ico`
3. 如果图标加载失败，就退回显示网站名称的首字母

所以一般情况下你不用手动配图标，除非：

- 这个站点没有稳定 favicon
- favicon 很糊
- 目标站会拦截引用
- 你想用自定义图标

自定义示例：

```ts
{
  id: "replicate",
  categoryId: "models",
  title: "Replicate",
  href: "https://replicate.com/",
  description: "运行和调用生成式模型时很方便。",
  tags: ["模型", "推理", "API"],
  iconUrl: "https://replicate.com/favicon.ico",
}
```

## 6. 排序规则

页面显示顺序目前很简单：

- 分类顺序：
  - 由 [`lib/tool-links.ts`](../lib/tool-links.ts) 里的 `externalLinkCategories` 数组顺序决定

- 每个分类下的网站顺序：
  - 由 [`lib/tool-links.ts`](../lib/tool-links.ts) 里的 `externalLinkEntries` 原始书写顺序决定

也就是说，如果你想让某个站点排在更前面，直接把它在数组里往上挪就可以。

## 7. 搜索会搜哪些内容

当前搜索会匹配以下内容：

- `title`
- `description`
- 域名
- `tags`

所以如果你希望这个站更容易被搜到，可以：

- 标题写清楚
- 描述写清用途
- 标签补上你自己常用的搜索词

## 8. 删除一个网站

直接从 [`lib/tool-links.ts`](../lib/tool-links.ts) 的 `externalLinkEntries` 中删掉对应对象即可。

例如删掉：

```ts
{
  id: "unsplash",
  ...
}
```

保存后刷新 `/tools`，这个网站就不会再显示。

## 9. 修改一个网站

也是直接改 [`lib/tool-links.ts`](../lib/tool-links.ts) 对应项：

- 想改名称，修改 `title`
- 想改描述，修改 `description`
- 想改分类，修改 `categoryId`
- 想改搜索关键词，修改 `tags`
- 想加“常用”标记，设置 `featured: true`
- 想换图标，补充 `iconUrl`

## 10. 推荐写法

推荐你新增网站时遵循这些习惯：

- `id` 用稳定英文，不要用中文和空格
- `href` 一律写完整 `https://...`
- `description` 不要只写“官网”，要写“你为什么会打开它”
- `tags` 优先写你自己会搜索的词
- 高频站点可以加 `featured: true`

推荐示例：

```ts
{
  id: "cursor",
  categoryId: "development",
  title: "Cursor",
  href: "https://www.cursor.com/",
  description: "做日常编码、重构和快速查项目上下文时会经常打开。",
  tags: ["编程", "AI IDE", "开发"],
  featured: true,
}
```

## 11. 修改后如何检查

最简单的检查方式：

1. 保存文件
2. 打开 `/tools`
3. 看这个网站是否出现在正确分类
4. 试一下搜索
5. 点击确认链接正确
6. 确认图标是否正常显示

如果你想更稳一点，也可以在项目根目录执行：

```bash
npm run build
```

## 12. 常见问题

### 图标不显示怎么办？

优先检查：

- `href` 是否正确
- 目标站有没有 favicon
- 目标站是否阻止外部加载 favicon

如果有问题，直接加 `iconUrl`。

### 新分类报类型错误怎么办？

通常是因为你只改了 [`lib/tool-links.ts`](../lib/tool-links.ts)，没有同步改 [`components/site/external-links-directory.tsx`](../components/site/external-links-directory.tsx) 里的 `categoryIconMap`。

### 我想以后做成后台可视化管理可以吗？

可以。

现在这版先用数据文件维护，优点是简单、稳定、改起来快。后面如果你想做后台可管理，可以基于当前这个数据结构继续扩展成数据库表和后台表单。

## 13. 你以后最常改的文件

通常只会改这两个地方：

- [`lib/tool-links.ts`](../lib/tool-links.ts)
- [`components/site/external-links-directory.tsx`](../components/site/external-links-directory.tsx)

其中：

- 日常新增/删除/改网址：只改 `lib/tool-links.ts`
- 新增分类图标或改展示逻辑：再改 `components/site/external-links-directory.tsx`
