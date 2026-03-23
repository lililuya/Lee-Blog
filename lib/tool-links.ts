export type ExternalLinkCategoryId =
  | "research"
  | "models"
  | "development"
  | "coding"
  | "knowledge"
  | "design";

export type ExternalLinkCategory = {
  id: ExternalLinkCategoryId;
  label: string;
  description: string;
};

export type ExternalLinkEntry = {
  id: string;
  categoryId: ExternalLinkCategoryId;
  title: string;
  href: string;
  description: string;
  tags: string[];
  featured?: boolean;
  iconUrl?: string;
};

// 在这里维护你自己的常用站外导航。
// 详细说明见：docs/tools-navigation.zh-CN.md
// 每一项都支持：分类、标题、链接、描述、标签，以及可选的 iconUrl 覆盖地址。
export const externalLinkCategories: ExternalLinkCategory[] = [
  {
    id: "research",
    label: "论文研究",
    description: "找论文、追引用、看基线和研究脉络。",
  },
  {
    id: "models",
    label: "模型平台",
    description: "常用模型、接口平台和推理入口。",
  },
  {
    id: "development",
    label: "开发部署",
    description: "代码、框架、部署、运维与文档查询。",
  },
  {
    id: "coding",
    label: "刷题竞赛",
    description: "算法练习、在线评测、比赛与题单训练。",
  },
  {
    id: "knowledge",
    label: "写作知识库",
    description: "笔记沉淀、资料整理与知识管理。",
  },
  {
    id: "design",
    label: "设计素材",
    description: "原型、图表、压缩与视觉参考。",
  },
];

export const externalLinkEntries: ExternalLinkEntry[] = [
  {
    id: "arxiv",
    categoryId: "research",
    title: "arXiv",
    href: "https://arxiv.org/",
    description: "每天看新论文最直接的入口，适合配合你的 Daily paper radar 使用。",
    tags: ["论文", "预印本", "跟踪"],
    featured: true,
  },
  {
    id: "papers-with-code",
    categoryId: "research",
    title: "Papers with Code",
    href: "https://paperswithcode.com/",
    description: "查论文对应代码仓库、排行榜和任务基线时非常方便。",
    tags: ["代码", "排行榜", "基线"],
    featured: true,
  },
  {
    id: "semantic-scholar",
    categoryId: "research",
    title: "Semantic Scholar",
    href: "https://www.semanticscholar.org/",
    description: "适合快速看引用关系、作者轨迹和相近研究。",
    tags: ["引用", "作者", "检索"],
  },
  {
    id: "connected-papers",
    categoryId: "research",
    title: "Connected Papers",
    href: "https://www.connectedpapers.com/",
    description: "从一篇论文出发看相关工作网络，适合梳理某个主题脉络。",
    tags: ["图谱", "脉络", "相关工作"],
  },
  {
    id: "google-scholar",
    categoryId: "research",
    title: "Google Scholar",
    href: "https://scholar.google.com/",
    description: "适合查作者主页、引用量和更广义的学术搜索结果。",
    tags: ["学术搜索", "引用", "作者"],
  },
  {
    id: "zotero",
    categoryId: "research",
    title: "Zotero",
    href: "https://www.zotero.org/",
    description: "管理文献、批注和参考文献格式时很实用。",
    tags: ["文献管理", "引用", "资料库"],
  },
  {
    id: "openai-platform",
    categoryId: "models",
    title: "OpenAI Platform",
    href: "https://platform.openai.com/",
    description: "查看模型、API Key、用量和接口文档的主入口。",
    tags: ["API", "模型", "平台"],
    featured: true,
  },
  {
    id: "anthropic-console",
    categoryId: "models",
    title: "Anthropic Console",
    href: "https://console.anthropic.com/",
    description: "用于管理 Claude 相关 API、模型和控制台配置。",
    tags: ["Claude", "API", "控制台"],
  },
  {
    id: "deepseek-platform",
    categoryId: "models",
    title: "DeepSeek Platform",
    href: "https://platform.deepseek.com/",
    description: "管理 DeepSeek 模型调用和密钥配置时可直接跳转。",
    tags: ["DeepSeek", "API", "模型"],
  },
  {
    id: "hugging-face",
    categoryId: "models",
    title: "Hugging Face",
    href: "https://huggingface.co/",
    description: "查模型卡、数据集、Spaces 和社区实验的高频站点。",
    tags: ["模型库", "数据集", "社区"],
    featured: true,
  },
  {
    id: "openrouter",
    categoryId: "models",
    title: "OpenRouter",
    href: "https://openrouter.ai/",
    description: "做多模型切换、价格比较和统一路由时很方便。",
    tags: ["路由", "多模型", "价格"],
  },
  {
    id: "ollama",
    categoryId: "models",
    title: "Ollama",
    href: "https://ollama.com/",
    description: "本地模型运行、拉取和简单管理的入口。",
    tags: ["本地模型", "推理", "部署"],
  },
  {
    id: "github",
    categoryId: "development",
    title: "GitHub",
    href: "https://github.com/",
    description: "代码仓库、Issue、PR 和发布记录的核心入口。",
    tags: ["代码", "协作", "版本管理"],
    featured: true,
  },
  {
    id: "nextjs",
    categoryId: "development",
    title: "Next.js",
    href: "https://nextjs.org/docs",
    description: "查 App Router、路由、缓存和部署文档时最常用。",
    tags: ["前端", "文档", "框架"],
  },
  {
    id: "prisma",
    categoryId: "development",
    title: "Prisma",
    href: "https://www.prisma.io/docs",
    description: "数据库 schema、迁移和查询相关文档入口。",
    tags: ["数据库", "ORM", "文档"],
  },
  {
    id: "vercel",
    categoryId: "development",
    title: "Vercel",
    href: "https://vercel.com/",
    description: "部署、环境变量、预览分支和日志查看入口。",
    tags: ["部署", "预览", "日志"],
  },
  {
    id: "mdn",
    categoryId: "development",
    title: "MDN Web Docs",
    href: "https://developer.mozilla.org/",
    description: "查浏览器 API、CSS 细节和 Web 标准时最稳定。",
    tags: ["Web", "CSS", "浏览器"],
  },
  {
    id: "cloudflare",
    categoryId: "development",
    title: "Cloudflare",
    href: "https://dash.cloudflare.com/",
    description: "域名、DNS、缓存与网络层配置入口。",
    tags: ["DNS", "网络", "运维"],
  },
  {
    id: "leetcode-cn",
    categoryId: "coding",
    title: "LeetCode",
    href: "https://leetcode.cn/",
    description: "刷算法题、看题解、做面试准备时最常用的入口之一。",
    tags: ["算法", "刷题", "面试"],
    featured: true,
  },
  {
    id: "nowcoder",
    categoryId: "coding",
    title: "牛客网",
    href: "https://www.nowcoder.com/",
    description: "适合做笔试题、面经准备、校招练习和高频面试题回顾。",
    tags: ["笔试", "面试", "校招"],
  },
  {
    id: "codeforces",
    categoryId: "coding",
    title: "Codeforces",
    href: "https://codeforces.com/",
    description: "做竞赛题、参加比赛、看 rating 和学习题解时非常方便。",
    tags: ["竞赛", "算法", "比赛"],
  },
  {
    id: "acwing",
    categoryId: "coding",
    title: "AcWing",
    href: "https://www.acwing.com/",
    description: "中文算法学习路径比较完整，题库、课程和比赛入口都很集中。",
    tags: ["算法", "中文", "题库"],
  },
  {
    id: "hackerrank",
    categoryId: "coding",
    title: "HackerRank",
    href: "https://www.hackerrank.com/",
    description: "适合练基础编程题、SQL、数据结构以及英文环境下的在线评测。",
    tags: ["编程题", "SQL", "在线评测"],
  },
  {
    id: "atcoder",
    categoryId: "coding",
    title: "AtCoder",
    href: "https://atcoder.jp/",
    description: "题目质量稳定，适合持续做算法训练和参加规则清晰的比赛。",
    tags: ["竞赛", "算法", "训练"],
  },
  {
    id: "luogu",
    categoryId: "coding",
    title: "洛谷",
    href: "https://www.luogu.com.cn/",
    description: "中文 OJ 社区，适合按专题刷题、看题单和查基础算法模板。",
    tags: ["中文 OJ", "题单", "模板"],
  },
  {
    id: "cses",
    categoryId: "coding",
    title: "CSES",
    href: "https://cses.fi/",
    description: "经典算法题单很系统，适合按知识点逐步补齐数据结构与算法基础。",
    tags: ["题单", "算法基础", "训练"],
  },
  {
    id: "notion",
    categoryId: "knowledge",
    title: "Notion",
    href: "https://www.notion.so/",
    description: "整理大纲、任务和资料清单时很方便。",
    tags: ["笔记", "任务", "知识库"],
    featured: true,
  },
  {
    id: "obsidian",
    categoryId: "knowledge",
    title: "Obsidian",
    href: "https://obsidian.md/",
    description: "做双链笔记、知识图谱和长期沉淀时很适合。",
    tags: ["双链", "笔记", "沉淀"],
  },
  {
    id: "readwise",
    categoryId: "knowledge",
    title: "Readwise",
    href: "https://readwise.io/",
    description: "管理高亮、回顾摘录和统一阅读输入。",
    tags: ["摘录", "高亮", "回顾"],
  },
  {
    id: "yuque",
    categoryId: "knowledge",
    title: "语雀",
    href: "https://www.yuque.com/",
    description: "中文写作、文档协作和知识整理都比较顺手。",
    tags: ["中文写作", "文档", "协作"],
  },
  {
    id: "feishu-docs",
    categoryId: "knowledge",
    title: "飞书文档",
    href: "https://www.feishu.cn/",
    description: "多人协作、表格和流程文档管理入口。",
    tags: ["协作", "文档", "表格"],
  },
  {
    id: "figma",
    categoryId: "design",
    title: "Figma",
    href: "https://www.figma.com/",
    description: "页面草图、界面结构和视觉稿都能快速出原型。",
    tags: ["原型", "UI", "协作"],
    featured: true,
  },
  {
    id: "excalidraw",
    categoryId: "design",
    title: "Excalidraw",
    href: "https://excalidraw.com/",
    description: "画流程图、信息结构草图和讲解图特别快。",
    tags: ["草图", "流程图", "结构图"],
  },
  {
    id: "squoosh",
    categoryId: "design",
    title: "Squoosh",
    href: "https://squoosh.app/",
    description: "压缩图片、改格式和预览体积时很好用。",
    tags: ["图片压缩", "格式转换", "媒体"],
  },
  {
    id: "unsplash",
    categoryId: "design",
    title: "Unsplash",
    href: "https://unsplash.com/",
    description: "找气质统一的配图或封面灵感时很好用。",
    tags: ["配图", "灵感", "视觉素材"],
  },
];
