import { JournalStatus, PostStatus } from "@prisma/client";
import { getDigestDate } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, slugify } from "@/lib/utils";

const DAY_MS = 1000 * 60 * 60 * 24;
const SHANGHAI_TIMEZONE = "Asia/Shanghai";

function formatShanghaiDate(date: Date, locale = "en-CA") {
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

function buildHighlights(input: {
  paperCount: number;
  topicCount: number;
  journalCount: number;
  postCount: number;
  featuredTopics: string[];
}) {
  const highlights = [
    input.paperCount > 0
      ? `Tracked ${input.paperCount} papers across ${input.topicCount} active research topics this week.`
      : "No new synchronized paper entries landed in this digest window.",
    input.journalCount > 0
      ? `Logged ${input.journalCount} journal updates to capture process, notes, and intermediate conclusions.`
      : "No new journal updates were published during this digest window.",
    input.postCount > 0
      ? `Published ${input.postCount} public posts that turned this week's work into reusable output.`
      : "No new public posts were published during this digest window.",
  ];

  if (input.featuredTopics.length > 0) {
    highlights.push(`Priority topics this week: ${input.featuredTopics.join(", ")}.`);
  }

  return highlights.slice(0, 4);
}

export async function generateWeeklyDigest(referenceDate = new Date()) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const { periodStart, periodEnd, periodEndExclusive } = getWeeklyDigestWindow(referenceDate);

  const [papers, journals, posts, existingDigest] = await Promise.all([
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
      orderBy: { publishedAt: "desc" },
    }),
    prisma.weeklyDigest.findUnique({
      where: {
        periodStart_periodEnd: {
          periodStart,
          periodEnd,
        },
      },
      select: {
        id: true,
        publishedAt: true,
        seriesId: true,
        seriesOrder: true,
      },
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
  const periodLabel = `${formatShanghaiDate(periodStart)} - ${formatShanghaiDate(periodEnd)}`;
  const title = `Weekly Research Digest | ${periodLabel}`;
  const slug = slugify(
    `weekly-digest-${formatShanghaiDate(periodStart)}-to-${formatShanghaiDate(periodEnd)}`,
  );
  const summary =
    papers.length > 0 || journals.length > 0 || posts.length > 0
      ? `This issue covers ${formatShanghaiDate(periodStart)} through ${formatShanghaiDate(periodEnd)} with ${papers.length} papers, ${journals.length} journal updates, and ${posts.length} published posts.`
      : `This issue covers ${formatShanghaiDate(periodStart)} through ${formatShanghaiDate(periodEnd)}. No new papers, journals, or posts entered the public digest flow this week.`;

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
              return `- [${paper.title}](${paper.paperUrl})${category}: ${truncate(paper.summary, 120)}`;
            });

            return `### ${topic.name}\n\n${lines.join("\n")}`;
          })
          .join("\n\n")
      : "No newly synchronized paper entries were captured in this weekly window.";

  const journalSection =
    journals.length > 0
      ? journals
          .slice(0, 5)
          .map((entry) => `- **${entry.title}**: ${truncate(entry.summary, 110)}`)
          .join("\n")
      : "- No new journal entries were published this week.";

  const postSection =
    posts.length > 0
      ? posts
          .slice(0, 4)
          .map((post) => `- [${post.title}](/blog/${post.slug}): ${truncate(post.excerpt, 110)}`)
          .join("\n")
      : "- No new public posts were published this week.";

  const nextFocus = [
    featuredTopics[0]
      ? `Read two or three more papers under ${featuredTopics[0]} and turn the strongest ideas into annotations or note cards.`
      : "Add or refine research topics in the admin console so the next digest has a stronger intake stream.",
    journals.length > 0
      ? "Promote the strongest journal conclusions into durable notes, outlines, or longer essays."
      : "Capture at least one working journal entry next week so research progress is easier to review later.",
    posts.length > 0
      ? "Cross-link this week's new posts with the notes and papers they rely on to strengthen the site knowledge graph."
      : "Turn one promising paper cluster or journal thread into a public-facing article next week.",
  ]
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");

  const content = [
    "## Weekly overview",
    ...highlights.map((item) => `- ${item}`),
    "",
    "## Topic clusters",
    topicSection,
    "",
    "## Journal recap",
    journalSection,
    "",
    "## Published output",
    postSection,
    "",
    "## Next focus",
    nextFocus,
  ].join("\n");

  const publishedAt = existingDigest?.publishedAt ?? new Date();
  const digest = existingDigest
    ? await prisma.weeklyDigest.update({
        where: { id: existingDigest.id },
        data: {
          title,
          slug,
          summary,
          content,
          highlights,
          featuredTopics,
          paperCount: papers.length,
          journalCount: journals.length,
          postCount: posts.length,
          publishedAt,
        },
      })
    : await prisma.weeklyDigest.create({
        data: {
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
          publishedAt,
        },
      });

  return {
    digest,
    wasCreated: !existingDigest,
    stats: {
      paperCount: papers.length,
      journalCount: journals.length,
      postCount: posts.length,
      topicCount: topicGroups.length,
    },
  };
}
