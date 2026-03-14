import { JournalStatus, PostStatus } from "@prisma/client";
import { getDigestDate } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, slugify } from "@/lib/utils";

const DAY_MS = 1000 * 60 * 60 * 24;
const SHANGHAI_TIMEZONE = "Asia/Shanghai";

function formatShanghaiDate(date: Date, locale: string = "en-CA") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: SHANGHAI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function truncate(text: string, maxLength: number) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1)}...`;
}

export function getWeeklyDigestWindow(referenceDate = new Date()) {
  const periodEndExclusive = getDigestDate(referenceDate);
  const periodStart = new Date(periodEndExclusive.getTime() - 7 * DAY_MS);
  const periodEnd = new Date(periodEndExclusive.getTime() - 1);

  return {
    periodStart,
    periodEnd,
    periodEndExclusive,
  };
}

function buildHighlights({
  paperCount,
  topicCount,
  journalCount,
  postCount,
  featuredTopics,
}: {
  paperCount: number;
  topicCount: number;
  journalCount: number;
  postCount: number;
  featuredTopics: string[];
}) {
  const highlights = [
    paperCount > 0
      ? `本周同步了 ${paperCount} 篇论文，覆盖 ${topicCount} 个研究主题。`
      : "本周暂无新的论文同步结果。",
    journalCount > 0
      ? `记录了 ${journalCount} 条阶段性日志，方便后续回顾研究推进节奏。`
      : "本周没有新增日志记录。",
    postCount > 0
      ? `发布了 ${postCount} 篇正式文章，可以作为本周重点输出继续沉淀。`
      : "本周暂无新发布文章。",
  ];

  if (featuredTopics.length > 0) {
    highlights.push(`最值得优先关注的主题是 ${featuredTopics.join("、")}。`);
  }

  return highlights.slice(0, 4);
}

export async function generateWeeklyDigest(referenceDate = new Date()) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const { periodStart, periodEnd, periodEndExclusive } = getWeeklyDigestWindow(referenceDate);

  const [papers, journals, posts] = await Promise.all([
    prisma.dailyPaperEntry.findMany({
      where: {
        digestDate: {
          gte: periodStart,
          lt: periodEndExclusive,
        },
      },
      include: { topic: true },
      orderBy: [{ digestDate: "desc" }, { publishedAt: "desc" }],
    }),
    prisma.journalEntry.findMany({
      where: {
        status: JournalStatus.PUBLISHED,
        publishedAt: {
          gte: periodStart,
          lt: periodEndExclusive,
        },
      },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt: {
          gte: periodStart,
          lt: periodEndExclusive,
        },
      },
      include: { author: true },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  const topicMap = new Map<
    string,
    {
      name: string;
      count: number;
      papers: typeof papers;
    }
  >();

  for (const paper of papers) {
    const current = topicMap.get(paper.topicId) ?? {
      name: paper.topic.name,
      count: 0,
      papers: [],
    };
    current.count += 1;
    current.papers.push(paper);
    topicMap.set(paper.topicId, current);
  }

  const topicGroups = Array.from(topicMap.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.name.localeCompare(right.name, "zh-CN");
  });

  const featuredTopics = topicGroups.slice(0, 3).map((topic) => topic.name);
  const periodLabel = `${formatShanghaiDate(periodStart, "zh-CN")} - ${formatShanghaiDate(periodEnd, "zh-CN")}`;
  const title = `每周研究简报 | ${periodLabel}`;
  const slug = slugify(
    `weekly-digest-${formatShanghaiDate(periodStart)}-to-${formatShanghaiDate(periodEnd)}`,
  );
  const summary =
    papers.length > 0 || journals.length > 0 || posts.length > 0
      ? `本期简报覆盖 ${formatShanghaiDate(periodStart, "zh-CN")} 至 ${formatShanghaiDate(periodEnd, "zh-CN")} 的站内更新，共整理 ${papers.length} 篇论文、${journals.length} 条日志和 ${posts.length} 篇文章。`
      : `本期简报覆盖 ${formatShanghaiDate(periodStart, "zh-CN")} 至 ${formatShanghaiDate(periodEnd, "zh-CN")}。这一周暂无新的论文、日志或文章内容进入归档。`;

  const highlights = buildHighlights({
    paperCount: papers.length,
    topicCount: topicGroups.length,
    journalCount: journals.length,
    postCount: posts.length,
    featuredTopics,
  });

  const topicSection =
    topicGroups.length > 0
      ? topicGroups
          .slice(0, 4)
          .map((topic) => {
            const lines = topic.papers.slice(0, 3).map((paper) => {
              const category = paper.primaryCategory ? ` (${paper.primaryCategory})` : "";
              return `- [${paper.title}](${paper.paperUrl})${category}：${truncate(paper.summary, 120)}`;
            });

            return `### ${topic.name}\n\n${lines.join("\n")}`;
          })
          .join("\n\n")
      : "本周没有同步到新的论文条目。";

  const journalSection =
    journals.length > 0
      ? journals
          .slice(0, 5)
          .map(
            (entry) =>
              `- **${entry.title}**：${truncate(entry.summary, 110)}`,
          )
          .join("\n")
      : "- 本周没有新增日志记录。";

  const postSection =
    posts.length > 0
      ? posts
          .slice(0, 4)
          .map(
            (post) =>
              `- [${post.title}](/blog/${post.slug})：${truncate(post.excerpt, 110)}`,
          )
          .join("\n")
      : "- 本周没有新增公开文章。";

  const nextFocus = [
    featuredTopics[0]
      ? `优先深入阅读 ${featuredTopics[0]} 主题下最相关的 2-3 篇论文，并补充个人批注。`
      : "下周可以先在后台补充新的论文主题，让研究输入更持续。",
    journals.length > 0
      ? "把本周日志中的阶段性结论整理成更稳定的知识卡片或长文草稿。"
      : "如果本周更多是在阅读和准备阶段，建议增加一条日志记录保存过程信息。",
    posts.length > 0
      ? "把新发布文章与对应论文建立交叉引用，提高站内知识可检索性。"
      : "如果已有足够素材，可以将其中一个主题发展成完整博客文章。",
  ]
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");

  const content = [
    "## 本周概览",
    ...highlights.map((item) => `- ${item}`),
    "",
    "## 本周重点主题",
    topicSection,
    "",
    "## 日志回顾",
    journalSection,
    "",
    "## 本周输出",
    postSection,
    "",
    "## 下周建议关注",
    nextFocus,
  ].join("\n");

  const digest = await prisma.weeklyDigest.upsert({
    where: {
      periodStart_periodEnd: {
        periodStart,
        periodEnd,
      },
    },
    update: {
      title,
      slug,
      summary,
      content,
      highlights,
      featuredTopics,
      paperCount: papers.length,
      journalCount: journals.length,
      postCount: posts.length,
      publishedAt: new Date(),
    },
    create: {
      title,
      slug,
      summary,
      content,
      highlights,
      featuredTopics,
      paperCount: papers.length,
      journalCount: journals.length,
      postCount: posts.length,
      periodStart,
      periodEnd,
      publishedAt: new Date(),
    },
  });

  return {
    digest,
    stats: {
      paperCount: papers.length,
      journalCount: journals.length,
      postCount: posts.length,
      topicCount: topicGroups.length,
    },
  };
}