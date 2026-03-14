import "server-only";
import {
  CommentStatus,
  JournalStatus,
  PostStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  demoComments,
  demoJournalEntries,
  demoNotes,
  demoPaperEntries,
  demoPaperTopics,
  demoPosts,
  demoProfile,
  demoProviders,
  demoWeeklyDigests,
} from "@/lib/demo-data";
import { getDigestDate } from "@/lib/papers";
import { buildFooterAnalytics, getDemoFooterAnalytics } from "@/lib/visitor-analytics";
import { isDatabaseConfigured } from "@/lib/utils";

function containsText(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  return values.some((value) => (value ?? "").toLowerCase().includes(normalized));
}

export async function getSiteProfile() {
  if (!isDatabaseConfigured()) {
    return demoProfile;
  }

  return (await prisma.siteProfile.findUnique({ where: { id: "main" } })) ?? demoProfile;
}

export async function getFeaturedPosts(limit = 2) {
  if (!isDatabaseConfigured()) {
    return demoPosts.filter((post) => post.featured).slice(0, limit);
  }

  return prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED, featured: true },
    include: { author: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

export async function getPublishedPosts() {
  if (!isDatabaseConfigured()) {
    return demoPosts;
  }

  return prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    include: { author: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getPublishedNotes() {
  if (!isDatabaseConfigured()) {
    return demoNotes;
  }

  return prisma.note.findMany({
    where: { status: PostStatus.PUBLISHED },
    include: { author: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getPostBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    const post = demoPosts.find((entry) => entry.slug === slug);

    if (!post) {
      return null;
    }

    return {
      ...post,
      comments: demoComments.filter((comment) => comment.postId === post.id),
    };
  }

  return prisma.post.findUnique({
    where: { slug },
    include: {
      author: true,
      comments: {
        where: { status: CommentStatus.APPROVED },
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getNoteBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    return demoNotes.find((entry) => entry.slug === slug) ?? null;
  }

  return prisma.note.findUnique({
    where: { slug },
    include: { author: true },
  });
}

export async function getRecentJournalEntries(limit = 4) {
  if (!isDatabaseConfigured()) {
    return demoJournalEntries.slice(0, limit);
  }

  return prisma.journalEntry.findMany({
    where: { status: JournalStatus.PUBLISHED },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getEnabledChatProviders() {
  if (!isDatabaseConfigured()) {
    return demoProviders.filter((provider) => provider.enabled);
  }

  const providers = await prisma.llmProvider.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
  });

  return providers.filter((provider) => Boolean(process.env[provider.apiKeyEnv]?.trim()));
}

export async function getChatProviderBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    return demoProviders.find((provider) => provider.slug === slug) ?? null;
  }

  return prisma.llmProvider.findUnique({ where: { slug } });
}

export async function getDashboardOverview() {
  if (!isDatabaseConfigured()) {
    return {
      posts: demoPosts.length,
      publishedPosts: demoPosts.length,
      notes: demoNotes.length,
      publishedNotes: demoNotes.length,
      journalEntries: demoJournalEntries.length,
      pendingComments: 0,
      providers: demoProviders.length,
      paperTopics: demoPaperTopics.length,
      todayPapers: demoPaperEntries.length,
      weeklyDigests: demoWeeklyDigests.length,
      users: 2,
      mutedUsers: 0,
      suspendedUsers: 0,
      auditLogs: 0,
    };
  }

  const digestDate = getDigestDate();
  const now = new Date();
  const [
    posts,
    publishedPosts,
    notes,
    publishedNotes,
    journalEntries,
    pendingComments,
    providers,
    paperTopics,
    todayPapers,
    weeklyDigests,
    users,
    mutedUsers,
    suspendedUsers,
    auditLogs,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: PostStatus.PUBLISHED } }),
    prisma.note.count(),
    prisma.note.count({ where: { status: PostStatus.PUBLISHED } }),
    prisma.journalEntry.count(),
    prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
    prisma.llmProvider.count(),
    prisma.paperTopic.count({ where: { enabled: true } }),
    prisma.dailyPaperEntry.count({ where: { digestDate } }),
    prisma.weeklyDigest.count(),
    prisma.user.count({ where: { status: { not: UserStatus.DELETED } } }),
    prisma.user.count({ where: { status: UserStatus.ACTIVE, mutedUntil: { gt: now } } }),
    prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
    prisma.adminAuditLog.count(),
  ]);

  return {
    posts,
    publishedPosts,
    notes,
    publishedNotes,
    journalEntries,
    pendingComments,
    providers,
    paperTopics,
    todayPapers,
    weeklyDigests,
    users,
    mutedUsers,
    suspendedUsers,
    auditLogs,
  };
}

export async function getAdminPosts() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.post.findMany({
    include: { author: true, _count: { select: { comments: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAdminPostById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.post.findUnique({ where: { id } });
}

export async function getAdminNotes() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.note.findMany({
    include: { author: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAdminNoteById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.note.findUnique({ where: { id } });
}

export async function getAdminJournalEntries() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.journalEntry.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getAdminJournalEntryById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.journalEntry.findUnique({ where: { id } });
}

export async function getAdminComments() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.comment.findMany({
    include: { author: true, post: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getAdminUsers() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.user.findMany({
    include: {
      _count: {
        select: {
          comments: true,
          posts: true,
          sessions: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "desc" }],
  });
}

export async function getAdminUserById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          comments: true,
          posts: true,
          sessions: true,
          auditLogsAuthored: true,
          auditLogsTargeted: true,
        },
      },
      posts: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      comments: {
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      sessions: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      },
      auditLogsTargeted: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      auditLogsAuthored: {
        include: {
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });
}

export async function getAdminAuditLogs(limit = 120) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.adminAuditLog.findMany({
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAdminProviders() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.llmProvider.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getAdminProviderById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.llmProvider.findUnique({ where: { id } });
}

export async function getAdminProfile() {
  if (!isDatabaseConfigured()) {
    return demoProfile;
  }

  return (await prisma.siteProfile.findUnique({ where: { id: "main" } })) ?? demoProfile;
}

export async function getPaperArchive(limit = 60) {
  if (!isDatabaseConfigured()) {
    return demoPaperEntries.slice(0, limit);
  }

  return prisma.dailyPaperEntry.findMany({
    include: { topic: true },
    orderBy: [{ digestDate: "desc" }, { topic: { name: "asc" } }, { publishedAt: "desc" }],
    take: limit,
  });
}

export async function getAdminPaperTopics() {
  if (!isDatabaseConfigured()) {
    return demoPaperTopics;
  }

  return prisma.paperTopic.findMany({
    include: {
      _count: { select: { entries: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAdminPaperTopicById(id: string) {
  if (!isDatabaseConfigured()) {
    return demoPaperTopics.find((topic) => topic.id === id) ?? null;
  }

  return prisma.paperTopic.findUnique({ where: { id } });
}

export async function getRecentPaperEntries(limit = 24) {
  if (!isDatabaseConfigured()) {
    return demoPaperEntries.slice(0, limit);
  }

  return prisma.dailyPaperEntry.findMany({
    include: { topic: true },
    orderBy: [{ digestDate: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
}

export async function getWeeklyDigests(limit = 12) {
  if (!isDatabaseConfigured()) {
    return demoWeeklyDigests.slice(0, limit);
  }

  return prisma.weeklyDigest.findMany({
    orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
}

export async function getLatestWeeklyDigest() {
  if (!isDatabaseConfigured()) {
    return demoWeeklyDigests[0] ?? null;
  }

  return prisma.weeklyDigest.findFirst({
    orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
  });
}

export async function getWeeklyDigestBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    return demoWeeklyDigests.find((digest) => digest.slug === slug) ?? null;
  }

  return prisma.weeklyDigest.findUnique({ where: { slug } });
}

export async function getAdminWeeklyDigests() {
  if (!isDatabaseConfigured()) {
    return demoWeeklyDigests;
  }

  return prisma.weeklyDigest.findMany({
    orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
  });
}

export async function searchSite(query: string, limitPerType = 6) {
  const normalized = query.trim();

  if (!normalized) {
    return {
      posts: [],
      notes: [],
      journalEntries: [],
      paperEntries: [],
      weeklyDigests: [],
      total: 0,
    };
  }

  if (!isDatabaseConfigured()) {
    const posts = demoPosts
      .filter((post) =>
        matchesSearch(normalized, [post.title, post.excerpt, post.content, post.category, post.tags.join(" ")]),
      )
      .slice(0, limitPerType);
    const notes = demoNotes
      .filter((note) =>
        matchesSearch(normalized, [note.title, note.summary, note.content, note.noteType, note.tags.join(" ")]),
      )
      .slice(0, limitPerType);
    const journalEntries = demoJournalEntries
      .filter((entry) => matchesSearch(normalized, [entry.title, entry.summary, entry.content, entry.mood]))
      .slice(0, limitPerType);
    const paperEntries = demoPaperEntries
      .filter((entry) =>
        matchesSearch(normalized, [
          entry.title,
          entry.summary,
          entry.primaryCategory,
          entry.topic.name,
          entry.authors.join(" "),
        ]),
      )
      .slice(0, limitPerType);
    const weeklyDigests = demoWeeklyDigests
      .filter((digest) =>
        matchesSearch(normalized, [
          digest.title,
          digest.summary,
          digest.content,
          digest.highlights.join(" "),
          digest.featuredTopics.join(" "),
        ]),
      )
      .slice(0, limitPerType);

    return {
      posts,
      notes,
      journalEntries,
      paperEntries,
      weeklyDigests,
      total: posts.length + notes.length + journalEntries.length + paperEntries.length + weeklyDigests.length,
    };
  }

  const [posts, notes, journalEntries, paperEntries, weeklyDigests] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        OR: [
          { title: containsText(normalized) },
          { excerpt: containsText(normalized) },
          { content: containsText(normalized) },
          { category: containsText(normalized) },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        publishedAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: limitPerType,
    }),
    prisma.note.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        OR: [
          { title: containsText(normalized) },
          { summary: containsText(normalized) },
          { content: containsText(normalized) },
          { noteType: containsText(normalized) },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        noteType: true,
        publishedAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: limitPerType,
    }),
    prisma.journalEntry.findMany({
      where: {
        status: JournalStatus.PUBLISHED,
        OR: [
          { title: containsText(normalized) },
          { summary: containsText(normalized) },
          { content: containsText(normalized) },
          { mood: containsText(normalized) },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        mood: true,
        publishedAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: limitPerType,
    }),
    prisma.dailyPaperEntry.findMany({
      where: {
        OR: [
          { title: containsText(normalized) },
          { summary: containsText(normalized) },
          { primaryCategory: containsText(normalized) },
          { topic: { is: { name: containsText(normalized) } } },
        ],
      },
      include: { topic: true },
      orderBy: [{ digestDate: "desc" }, { publishedAt: "desc" }],
      take: limitPerType,
    }),
    prisma.weeklyDigest.findMany({
      where: {
        OR: [
          { title: containsText(normalized) },
          { summary: containsText(normalized) },
          { content: containsText(normalized) },
        ],
      },
      orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
      take: limitPerType,
    }),
  ]);

  return {
    posts,
    notes,
    journalEntries,
    paperEntries,
    weeklyDigests,
    total: posts.length + notes.length + journalEntries.length + paperEntries.length + weeklyDigests.length,
  };
}

export async function getSitemapEntries() {
  const staticPages = ["/", "/blog", "/journal", "/notes", "/papers", "/digest", "/search", "/tools", "/login", "/register"];

  if (!isDatabaseConfigured()) {
    return {
      staticPages,
      posts: demoPosts.map((post) => post.slug),
      notes: demoNotes.map((note) => note.slug),
      journal: demoJournalEntries.map((entry) => entry.slug),
      digests: demoWeeklyDigests.map((digest) => digest.slug),
    };
  }

  const [posts, notes, journal, digests] = await Promise.all([
    prisma.post.findMany({ where: { status: PostStatus.PUBLISHED }, select: { slug: true } }),
    prisma.note.findMany({ where: { status: PostStatus.PUBLISHED }, select: { slug: true } }),
    prisma.journalEntry.findMany({ where: { status: JournalStatus.PUBLISHED }, select: { slug: true } }),
    prisma.weeklyDigest.findMany({ select: { slug: true } }),
  ]);

  return {
    staticPages,
    posts: posts.map((post) => post.slug),
    notes: notes.map((note) => note.slug),
    journal: journal.map((entry) => entry.slug),
    digests: digests.map((digest) => digest.slug),
  };
}

export function isAdminUser(role: UserRole | string | undefined) {
  return role === UserRole.ADMIN || role === "ADMIN";
}

async function resolveSiteLaunchDate() {
  const configuredLaunchDate = process.env.SITE_LAUNCHED_AT ? new Date(process.env.SITE_LAUNCHED_AT) : null;

  if (configuredLaunchDate && !Number.isNaN(configuredLaunchDate.getTime())) {
    return configuredLaunchDate;
  }

  const [firstPost, firstNote, firstJournalEntry, firstDigest, firstVisitor] = await Promise.all([
    prisma.post.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.note.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.journalEntry.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.weeklyDigest.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.siteVisitor.findFirst({ orderBy: { firstSeenAt: "asc" }, select: { firstSeenAt: true } }),
  ]);

  const candidates = [
    firstPost?.createdAt,
    firstNote?.createdAt,
    firstJournalEntry?.createdAt,
    firstDigest?.createdAt,
    firstVisitor?.firstSeenAt,
  ].filter((value): value is Date => Boolean(value));

  return candidates.sort((left, right) => left.getTime() - right.getTime())[0] ?? new Date();
}

export async function getFooterAnalytics() {
  if (!isDatabaseConfigured()) {
    return getDemoFooterAnalytics();
  }

  try {
    const [visitors, launchedAt] = await Promise.all([
      prisma.siteVisitor.findMany({
        select: {
          firstSeenAt: true,
          lastSeenAt: true,
          visitCount: true,
          regionKey: true,
          regionLabel: true,
        },
      }),
      resolveSiteLaunchDate(),
    ]);

    return buildFooterAnalytics(visitors, launchedAt);
  } catch {
    return getDemoFooterAnalytics();
  }
}

