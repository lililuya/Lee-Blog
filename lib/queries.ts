import {
  CommentStatus,
  PostStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import {
  hasCommentReplySupport,
  hasSiteProfileBackgroundMediaModeSupport,
  prisma,
} from "@/lib/prisma";
import {
  getPublishingCutoff,
  isLivePublishedAt,
  isPublicJournalLike,
  isPublicPostLike,
  publicJournalWhere,
  publicNoteWhere,
  publicPostWhere,
  publicWeeklyDigestWhere,
} from "@/lib/content-visibility";
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
import { recordSearchQuery } from "@/lib/site-analytics";
import { buildFooterAnalytics, getDemoFooterAnalytics } from "@/lib/visitor-analytics";
import { isDatabaseConfigured } from "@/lib/utils";

function containsText(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  return values.some((value) => (value ?? "").toLowerCase().includes(normalized));
}

type PopularTag = {
  tag: string;
  count: number;
};

type TagArchiveItem = {
  tag: string;
  count: number;
  postCount: number;
  noteCount: number;
  latestPublishedAt: Date | null;
};

type CategoryArchiveItem = {
  category: string;
  count: number;
  latestPublishedAt: Date | null;
};

type RecentComment = {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    name: string;
    avatarUrl?: string | null;
  };
  post: {
    title: string;
    slug: string;
  };
};

type ArchiveEntry = {
  id: string;
  title: string;
  href: string;
  kindLabel: string;
  publishedAt: Date;
};

type ArchiveMonthGroup = {
  key: string;
  label: string;
  total: number;
  entries: ArchiveEntry[];
};

const archiveMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type PublicSeriesEntry = {
  id: string;
  title: string;
  href: string;
  summary: string;
  kindLabel: string;
  type: "POST" | "NOTE" | "DIGEST";
  publishedAt: Date;
  seriesOrder: number | null;
};

type PublicSeriesDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  coverImageUrl: string | null;
  featured: boolean;
  totalCount: number;
  postCount: number;
  noteCount: number;
  digestCount: number;
  latestPublishedAt: Date | null;
  entries: PublicSeriesEntry[];
};

type NoteBacklink = {
  id: string;
  title: string;
  href: string;
  kindLabel: string;
  summary: string;
  publishedAt: Date;
};

function buildPopularTags(tagGroups: string[][], limit: number) {
  const counts = new Map<string, number>();

  for (const tags of tagGroups) {
    for (const tag of tags) {
      const normalized = tag.trim();

      if (!normalized) {
        continue;
      }

      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.tag.localeCompare(right.tag, "zh-CN");
    })
    .slice(0, limit);
}

function normalizeTaxonomyValue(value: string) {
  return value.trim().toLowerCase();
}

function contentLinksToNote(
  noteSlug: string,
  values: Array<string | null | undefined>,
) {
  const target = `/notes/${noteSlug.trim().toLowerCase()}`;

  if (!target || target === "/notes/") {
    return false;
  }

  return values.some((value) => (value ?? "").toLowerCase().includes(target));
}

function sortBacklinksByRecency(left: NoteBacklink, right: NoteBacklink) {
  const timeDifference = right.publishedAt.getTime() - left.publishedAt.getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function buildTagArchiveData(
  posts: Array<{ tags: string[]; publishedAt: Date | null }>,
  notes: Array<{ tags: string[]; publishedAt: Date | null }>,
  limit?: number,
): TagArchiveItem[] {
  const counts = new Map<
    string,
    {
      tag: string;
      count: number;
      postCount: number;
      noteCount: number;
      latestPublishedAt: Date | null;
    }
  >();

  for (const post of posts) {
    const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
    const uniqueTags = new Set(
      post.tags.map((tag) => tag.trim()).filter(Boolean),
    );

    for (const tag of uniqueTags) {
      const key = normalizeTaxonomyValue(tag);
      const current = counts.get(key) ?? {
        tag,
        count: 0,
        postCount: 0,
        noteCount: 0,
        latestPublishedAt: null,
      };

      current.tag = current.tag || tag;
      current.count += 1;
      current.postCount += 1;
      current.latestPublishedAt =
        !current.latestPublishedAt || (publishedAt && publishedAt > current.latestPublishedAt)
          ? publishedAt
          : current.latestPublishedAt;

      counts.set(key, current);
    }
  }

  for (const note of notes) {
    const publishedAt = note.publishedAt ? new Date(note.publishedAt) : null;
    const uniqueTags = new Set(
      note.tags.map((tag) => tag.trim()).filter(Boolean),
    );

    for (const tag of uniqueTags) {
      const key = normalizeTaxonomyValue(tag);
      const current = counts.get(key) ?? {
        tag,
        count: 0,
        postCount: 0,
        noteCount: 0,
        latestPublishedAt: null,
      };

      current.tag = current.tag || tag;
      current.count += 1;
      current.noteCount += 1;
      current.latestPublishedAt =
        !current.latestPublishedAt || (publishedAt && publishedAt > current.latestPublishedAt)
          ? publishedAt
          : current.latestPublishedAt;

      counts.set(key, current);
    }
  }

  const items = Array.from(counts.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const leftTime = left.latestPublishedAt?.getTime() ?? 0;
    const rightTime = right.latestPublishedAt?.getTime() ?? 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.tag.localeCompare(right.tag, "zh-CN");
  });

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function buildCategoryArchiveData(
  posts: Array<{ category: string; publishedAt: Date | null }>,
  limit?: number,
): CategoryArchiveItem[] {
  const counts = new Map<
    string,
    {
      category: string;
      count: number;
      latestPublishedAt: Date | null;
    }
  >();

  for (const post of posts) {
    const category = post.category.trim();

    if (!category) {
      continue;
    }

    const key = normalizeTaxonomyValue(category);
    const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
    const current = counts.get(key) ?? {
      category,
      count: 0,
      latestPublishedAt: null,
    };

    current.category = current.category || category;
    current.count += 1;
    current.latestPublishedAt =
      !current.latestPublishedAt || (publishedAt && publishedAt > current.latestPublishedAt)
        ? publishedAt
        : current.latestPublishedAt;

    counts.set(key, current);
  }

  const items = Array.from(counts.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const leftTime = left.latestPublishedAt?.getTime() ?? 0;
    const rightTime = right.latestPublishedAt?.getTime() ?? 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.category.localeCompare(right.category, "zh-CN");
  });

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function buildArchiveTimeline(entries: ArchiveEntry[], limitMonths?: number): ArchiveMonthGroup[] {
  const groups = new Map<string, ArchiveMonthGroup>();

  const sortedEntries = [...entries].sort(
    (left, right) => right.publishedAt.getTime() - left.publishedAt.getTime(),
  );

  for (const entry of sortedEntries) {
    const year = entry.publishedAt.getFullYear();
    const month = entry.publishedAt.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: `${year} 年 ${String(month).padStart(2, "0")} 月`,
        total: 0,
        entries: [],
      });
    }

    const group = groups.get(key)!;
    group.total += 1;
    group.entries.push(entry);
  }

  const timeline = Array.from(groups.values())
    .map((group) => {
      const [year, month] = group.key.split("-").map(Number);

      return {
        ...group,
        label: archiveMonthFormatter.format(new Date(Date.UTC(year, month - 1, 1))),
      };
    })
    .sort((left, right) => right.key.localeCompare(left.key));

  return typeof limitMonths === "number" ? timeline.slice(0, limitMonths) : timeline;
}

function compareSeriesEntries(left: PublicSeriesEntry, right: PublicSeriesEntry) {
  const leftOrder = left.seriesOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.seriesOrder ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const leftTime = left.publishedAt.getTime();
  const rightTime = right.publishedAt.getTime();

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function buildPublicSeriesDetailFromRecord(series: {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  coverImageUrl: string | null;
  featured: boolean;
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    publishedAt: Date | null;
    seriesOrder: number | null;
  }>;
  notes: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string;
    publishedAt: Date | null;
    seriesOrder: number | null;
  }>;
  weeklyDigests: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string;
    publishedAt: Date;
    seriesOrder: number | null;
  }>;
}): PublicSeriesDetail {
  const entries: PublicSeriesEntry[] = [
    ...series.posts
      .filter((post) => Boolean(post.publishedAt))
      .map((post) => ({
        id: post.id,
        title: post.title,
        href: `/blog/${post.slug}`,
        summary: post.excerpt,
        kindLabel: "Blog Post",
        type: "POST" as const,
        publishedAt: post.publishedAt!,
        seriesOrder: post.seriesOrder,
      })),
    ...series.notes
      .filter((note) => Boolean(note.publishedAt))
      .map((note) => ({
        id: note.id,
        title: note.title,
        href: `/notes/${note.slug}`,
        summary: note.summary,
        kindLabel: "Note",
        type: "NOTE" as const,
        publishedAt: note.publishedAt!,
        seriesOrder: note.seriesOrder,
      })),
    ...series.weeklyDigests.map((digest) => ({
      id: digest.id,
      title: digest.title,
      href: `/digest/${digest.slug}`,
      summary: digest.summary,
      kindLabel: "Weekly Digest",
      type: "DIGEST" as const,
      publishedAt: digest.publishedAt,
      seriesOrder: digest.seriesOrder,
    })),
  ].sort(compareSeriesEntries);

  return {
    id: series.id,
    title: series.title,
    slug: series.slug,
    summary: series.summary,
    description: series.description,
    coverImageUrl: series.coverImageUrl,
    featured: series.featured,
    totalCount: entries.length,
    postCount: entries.filter((entry) => entry.type === "POST").length,
    noteCount: entries.filter((entry) => entry.type === "NOTE").length,
    digestCount: entries.filter((entry) => entry.type === "DIGEST").length,
    latestPublishedAt:
      entries.length > 0
        ? [...entries]
            .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime())[0]
            ?.publishedAt ?? null
        : null,
    entries,
  };
}

async function resolveSiteProfileBackgroundMediaModeFallback() {
  try {
    const rows = await prisma.$queryRaw<Array<{ backgroundMediaMode: string | null }>>`
      SELECT "backgroundMediaMode"
      FROM "SiteProfile"
      WHERE "id" = 'main'
      LIMIT 1
    `;

    return rows[0]?.backgroundMediaMode ?? "IMAGE";
  } catch (error) {
    console.error("[queries:site-profile-background-mode]", error);
    return "IMAGE";
  }
}

async function normalizeSiteProfileRecord<
  T extends {
    backgroundMediaMode?: string | null;
  },
>(profile: T | null) {
  if (!profile) {
    return null;
  }

  if (hasSiteProfileBackgroundMediaModeSupport()) {
    return {
      ...profile,
      backgroundMediaMode: profile.backgroundMediaMode ?? "IMAGE",
    };
  }

  return {
    ...profile,
    backgroundMediaMode: await resolveSiteProfileBackgroundMediaModeFallback(),
  };
}

export async function getSiteProfile() {
  if (!isDatabaseConfigured()) {
    return demoProfile;
  }

  return (await normalizeSiteProfileRecord(
    await prisma.siteProfile.findUnique({ where: { id: "main" } }),
  )) ?? demoProfile;
}

export async function getSiteOwnerIdentity() {
  if (!isDatabaseConfigured()) {
    return {
      name: demoProfile.fullName,
      avatarUrl: demoProfile.heroImageUrl || null,
    };
  }

  const adminUser = await prisma.user.findFirst({
    where: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      name: true,
      avatarUrl: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return {
    name: adminUser?.name ?? demoProfile.fullName,
    avatarUrl: adminUser?.avatarUrl ?? demoProfile.heroImageUrl ?? null,
  };
}

export async function getPublicContentSeries(limit?: number) {
  if (!isDatabaseConfigured()) {
    return [] as PublicSeriesDetail[];
  }

  const cutoff = getPublishingCutoff();
  const series = await prisma.contentSeries.findMany({
    include: {
      posts: {
        where: publicPostWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
      notes: {
        where: publicNoteWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
      weeklyDigests: {
        where: publicWeeklyDigestWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });

  const visibleSeries = series
    .map((item) => buildPublicSeriesDetailFromRecord(item))
    .filter((item) => item.totalCount > 0)
    .sort((left, right) => {
      if (left.featured !== right.featured) {
        return left.featured ? -1 : 1;
      }

      const leftTime = left.latestPublishedAt?.getTime() ?? 0;
      const rightTime = right.latestPublishedAt?.getTime() ?? 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.title.localeCompare(right.title, "zh-CN");
    });

  return typeof limit === "number" ? visibleSeries.slice(0, limit) : visibleSeries;
}

export async function getPublicContentSeriesBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const cutoff = getPublishingCutoff();
  const series = await prisma.contentSeries.findUnique({
    where: { slug },
    include: {
      posts: {
        where: publicPostWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
      notes: {
        where: publicNoteWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
      weeklyDigests: {
        where: publicWeeklyDigestWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
    },
  });

  if (!series) {
    return null;
  }

  const detail = buildPublicSeriesDetailFromRecord(series);
  return detail.totalCount > 0 ? detail : null;
}

export async function getSeriesNavigation(input: {
  seriesId: string | null | undefined;
  contentId: string;
  type: "POST" | "NOTE" | "DIGEST";
}) {
  if (!input.seriesId || !isDatabaseConfigured()) {
    return null;
  }

  const cutoff = getPublishingCutoff();
  const series = await prisma.contentSeries.findUnique({
    where: { id: input.seriesId },
    include: {
      posts: {
        where: publicPostWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
      notes: {
        where: publicNoteWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
      weeklyDigests: {
        where: publicWeeklyDigestWhere(cutoff),
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          seriesOrder: true,
        },
      },
    },
  });

  if (!series) {
    return null;
  }

  const detail = buildPublicSeriesDetailFromRecord(series);
  const currentIndex = detail.entries.findIndex(
    (entry) => entry.id === input.contentId && entry.type === input.type,
  );

  if (currentIndex < 0) {
    return null;
  }

  return {
    series: {
      id: detail.id,
      title: detail.title,
      slug: detail.slug,
      summary: detail.summary,
      totalCount: detail.totalCount,
    },
    currentIndex,
    previous: currentIndex > 0 ? detail.entries[currentIndex - 1] : null,
    next: currentIndex < detail.entries.length - 1 ? detail.entries[currentIndex + 1] : null,
  };
}

export async function getFeaturedPosts(limit = 2) {
  if (!isDatabaseConfigured()) {
    return demoPosts
      .filter((post) => post.featured && isPublicPostLike(post))
      .slice(0, limit);
  }

  const cutoff = getPublishingCutoff();
  return prisma.post.findMany({
    where: { ...publicPostWhere(cutoff), featured: true },
    include: { author: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

export async function getPinnedPosts(limit = 1) {
  if (!isDatabaseConfigured()) {
    return demoPosts
      .filter((post) => post.pinned && isPublicPostLike(post))
      .sort((left, right) => new Date(right.publishedAt ?? 0).getTime() - new Date(left.publishedAt ?? 0).getTime())
      .slice(0, limit);
  }

  const cutoff = getPublishingCutoff();
  return prisma.post.findMany({
    where: { ...publicPostWhere(cutoff), pinned: true },
    include: { author: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

export async function getPublishedPosts(limit?: number) {
  if (!isDatabaseConfigured()) {
    const posts = [...demoPosts]
      .filter((post) => isPublicPostLike(post))
      .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      return new Date(right.publishedAt ?? 0).getTime() - new Date(left.publishedAt ?? 0).getTime();
      });

    return typeof limit === "number" ? posts.slice(0, limit) : posts;
  }

  const cutoff = getPublishingCutoff();
  return prisma.post.findMany({
    where: publicPostWhere(cutoff),
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
    ...(typeof limit === "number" ? { take: limit } : {}),
  });
}

function getPostSortTimestamp(post: { publishedAt: Date | null; updatedAt?: Date | null }) {
  return new Date(post.publishedAt ?? post.updatedAt ?? 0).getTime();
}

export async function getPostReadingContext(input: {
  postId: string;
  category: string;
  tags: string[];
}) {
  const posts = await getPublishedPosts();
  const normalizedCategory = normalizeTaxonomyValue(input.category);
  const normalizedTags = new Set(
    input.tags.map((tag) => normalizeTaxonomyValue(tag)).filter(Boolean),
  );

  const chronologicalPosts = [...posts].sort((left, right) => {
    const timeDifference = getPostSortTimestamp(right) - getPostSortTimestamp(left);

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return left.title.localeCompare(right.title, "zh-CN");
  });

  const currentIndex = chronologicalPosts.findIndex((post) => post.id === input.postId);
  const newerPost = currentIndex > 0 ? chronologicalPosts[currentIndex - 1] : null;
  const olderPost =
    currentIndex >= 0 && currentIndex < chronologicalPosts.length - 1
      ? chronologicalPosts[currentIndex + 1]
      : null;

  const relatedPosts = posts
    .filter((post) => post.id !== input.postId)
    .map((post) => {
      const sharedTagCount = post.tags.reduce((total, tag) => {
        return total + (normalizedTags.has(normalizeTaxonomyValue(tag)) ? 1 : 0);
      }, 0);
      const sameCategory = normalizeTaxonomyValue(post.category) === normalizedCategory;

      return {
        post,
        score: sharedTagCount * 4 + (sameCategory ? 3 : 0),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const timeDifference = getPostSortTimestamp(right.post) - getPostSortTimestamp(left.post);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return left.post.title.localeCompare(right.post.title, "zh-CN");
    })
    .map((entry) => entry.post)
    .slice(0, 3);

  return {
    newerPost,
    olderPost,
    relatedPosts,
  };
}

export async function getPublishedNotes(limit?: number) {
  if (!isDatabaseConfigured()) {
    const notes = demoNotes.filter((note) => isPublicPostLike(note));
    return typeof limit === "number" ? notes.slice(0, limit) : notes;
  }

  const cutoff = getPublishingCutoff();
  return prisma.note.findMany({
    where: publicNoteWhere(cutoff),
    include: { author: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    ...(typeof limit === "number" ? { take: limit } : {}),
  });
}

export async function getPopularTags(limit = 12): Promise<PopularTag[]> {
  if (!isDatabaseConfigured()) {
    const tagGroups = [
      ...demoPosts
        .filter((post) => isPublicPostLike(post))
        .map((post) => post.tags),
      ...demoNotes
        .filter((note) => isPublicPostLike(note))
        .map((note) => note.tags),
    ];

    return buildPopularTags(tagGroups, limit);
  }

  const cutoff = getPublishingCutoff();
  const [posts, notes] = await Promise.all([
    prisma.post.findMany({
      where: publicPostWhere(cutoff),
      select: { tags: true },
    }),
    prisma.note.findMany({
      where: publicNoteWhere(cutoff),
      select: { tags: true },
    }),
  ]);

  return buildPopularTags(
    [...posts.map((post) => post.tags), ...notes.map((note) => note.tags)],
    limit,
  );
}

export async function getTagArchive(limit?: number): Promise<TagArchiveItem[]> {
  const [posts, notes] = await Promise.all([getPublishedPosts(), getPublishedNotes()]);

  return buildTagArchiveData(posts, notes, limit);
}

export async function getCategoryArchive(limit?: number): Promise<CategoryArchiveItem[]> {
  const posts = await getPublishedPosts();
  return buildCategoryArchiveData(posts, limit);
}

export async function getTagDetail(tag: string) {
  const normalizedTag = normalizeTaxonomyValue(tag);

  if (!normalizedTag) {
    return null;
  }

  const [posts, notes] = await Promise.all([getPublishedPosts(), getPublishedNotes()]);
  const matchingPosts = posts.filter((post) =>
    post.tags.some((value) => normalizeTaxonomyValue(value) === normalizedTag),
  );
  const matchingNotes = notes.filter((note) =>
    note.tags.some((value) => normalizeTaxonomyValue(value) === normalizedTag),
  );

  if (matchingPosts.length === 0 && matchingNotes.length === 0) {
    return null;
  }

  const canonicalTag =
    matchingPosts.flatMap((post) => post.tags).find((value) => normalizeTaxonomyValue(value) === normalizedTag) ??
    matchingNotes.flatMap((note) => note.tags).find((value) => normalizeTaxonomyValue(value) === normalizedTag) ??
    tag.trim();

  return {
    tag: canonicalTag,
    posts: matchingPosts,
    notes: matchingNotes,
    total: matchingPosts.length + matchingNotes.length,
  };
}

export async function getCategoryDetail(category: string) {
  const normalizedCategory = normalizeTaxonomyValue(category);

  if (!normalizedCategory) {
    return null;
  }

  const posts = await getPublishedPosts();
  const matchingPosts = posts.filter(
    (post) => normalizeTaxonomyValue(post.category) === normalizedCategory,
  );

  if (matchingPosts.length === 0) {
    return null;
  }

  return {
    category: matchingPosts[0]?.category ?? category.trim(),
    posts: matchingPosts,
    total: matchingPosts.length,
  };
}

export async function getRecentApprovedComments(limit = 5): Promise<RecentComment[]> {
  if (!isDatabaseConfigured()) {
    const comments: RecentComment[] = demoComments
      .filter(
        (comment) => comment.status === CommentStatus.APPROVED && (comment.parentId ?? null) === null,
      )
      .flatMap((comment) => {
        const post = demoPosts.find((entry) => entry.id === comment.postId);

        if (!post || !isPublicPostLike(post)) {
          return [];
        }

        return [{
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: {
            name: comment.author.name,
            avatarUrl: null,
          },
          post: {
            title: post.title,
            slug: post.slug,
          },
        }];
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit);

    return comments;
  }

  const repliesSupported = hasCommentReplySupport();
  const cutoff = getPublishingCutoff();

  return prisma.comment.findMany({
    where: {
      status: CommentStatus.APPROVED,
      ...(repliesSupported ? { parentId: null } : {}),
      post: publicPostWhere(cutoff),
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
      post: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function getContentArchive(limitMonths?: number): Promise<ArchiveMonthGroup[]> {
  if (!isDatabaseConfigured()) {
    const archiveEntries: ArchiveEntry[] = [
      ...demoPosts
        .filter((post) => isPublicPostLike(post))
        .map((post) => ({
          id: post.id,
          title: post.title,
          href: `/blog/${post.slug}`,
          kindLabel: "博客",
          publishedAt: new Date(post.publishedAt!),
        })),
      ...demoNotes
        .filter((note) => isPublicPostLike(note))
        .map((note) => ({
          id: note.id,
          title: note.title,
          href: `/notes/${note.slug}`,
          kindLabel: "笔记",
          publishedAt: new Date(note.publishedAt!),
        })),
      ...demoJournalEntries
        .filter((entry) => isPublicJournalLike(entry))
        .map((entry) => ({
          id: entry.id,
          title: entry.title,
          href: "/journal",
          kindLabel: "日志",
          publishedAt: new Date(entry.publishedAt),
        })),
      ...demoWeeklyDigests
        .filter((digest) => isLivePublishedAt(digest.publishedAt))
        .map((digest) => ({
          id: digest.id,
          title: digest.title,
          href: `/digest/${digest.slug}`,
          kindLabel: "周报",
          publishedAt: new Date(digest.publishedAt),
        })),
    ];

    return buildArchiveTimeline(archiveEntries, limitMonths);
  }

  const cutoff = getPublishingCutoff();
  const [posts, notes, journals, digests] = await Promise.all([
    prisma.post.findMany({
      where: publicPostWhere(cutoff),
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
      },
    }),
    prisma.note.findMany({
      where: publicNoteWhere(cutoff),
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
      },
    }),
    prisma.journalEntry.findMany({
      where: publicJournalWhere(cutoff),
      select: {
        id: true,
        title: true,
        publishedAt: true,
      },
    }),
    prisma.weeklyDigest.findMany({
      where: publicWeeklyDigestWhere(cutoff),
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
      },
    }),
  ]);

  const archiveEntries: ArchiveEntry[] = [
    ...posts.map((post) => ({
      id: post.id,
      title: post.title,
      href: `/blog/${post.slug}`,
      kindLabel: "博客",
      publishedAt: post.publishedAt!,
    })),
    ...notes.map((note) => ({
      id: note.id,
      title: note.title,
      href: `/notes/${note.slug}`,
      kindLabel: "笔记",
      publishedAt: note.publishedAt!,
    })),
    ...journals.map((entry) => ({
      id: entry.id,
      title: entry.title,
      href: "/journal",
      kindLabel: "日志",
      publishedAt: entry.publishedAt,
    })),
    ...digests.map((digest) => ({
      id: digest.id,
      title: digest.title,
      href: `/digest/${digest.slug}`,
      kindLabel: "周报",
      publishedAt: digest.publishedAt,
    })),
  ];

  return buildArchiveTimeline(archiveEntries, limitMonths);
}

export async function getPostBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    const post = demoPosts.find((entry) => entry.slug === slug);

    if (!post || !isPublicPostLike(post)) {
      return null;
    }

      return {
        ...post,
        series: null,
        seriesId: null,
        seriesOrder: null,
        comments: demoComments
          .filter((comment) => comment.postId === post.id && comment.status === CommentStatus.APPROVED)
          .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    };
  }

  const repliesSupported = hasCommentReplySupport();
  const cutoff = getPublishingCutoff();

  if (!repliesSupported) {
    const post = await prisma.post.findFirst({
      where: {
        slug,
        ...publicPostWhere(cutoff),
      },
        include: {
          author: true,
          series: true,
          comments: {
            where: { status: CommentStatus.APPROVED },
            include: { author: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!post) {
      return null;
    }

    return {
      ...post,
      comments: post.comments.map((comment) => ({
        ...comment,
        parentId: null,
      })),
    };
  }

  return prisma.post.findFirst({
    where: {
      slug,
      ...publicPostWhere(cutoff),
    },
      include: {
        author: true,
        series: true,
        comments: {
          where: { status: CommentStatus.APPROVED },
          select: {
          id: true,
          content: true,
          status: true,
          moderationNotes: true,
          moderationMatches: true,
          createdAt: true,
          updatedAt: true,
          postId: true,
          authorId: true,
          parentId: true,
          author: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getNoteBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    const note = demoNotes.find((entry) => entry.slug === slug) ?? null;
    return note && isPublicPostLike(note)
      ? {
          ...note,
          seriesId: null,
          seriesOrder: null,
          series: null,
        }
      : null;
  }

  const cutoff = getPublishingCutoff();

  return prisma.note.findFirst({
    where: {
      slug,
      ...publicNoteWhere(cutoff),
    },
    include: { author: true, series: true },
  });
}

export async function getNoteBacklinks(noteSlug: string) {
  const normalizedSlug = noteSlug.trim().toLowerCase();

  if (!normalizedSlug) {
    return [] as NoteBacklink[];
  }

  if (!isDatabaseConfigured()) {
    const backlinks: NoteBacklink[] = [
      ...demoPosts
        .filter(
          (post) =>
            isPublicPostLike(post) &&
            contentLinksToNote(normalizedSlug, [post.excerpt, post.content]),
        )
        .map((post) => ({
          id: post.id,
          title: post.title,
          href: `/blog/${post.slug}`,
          kindLabel: "Blog post",
          summary: post.excerpt,
          publishedAt: post.publishedAt!,
        })),
      ...demoNotes
        .filter(
          (note) =>
            note.slug !== normalizedSlug &&
            isPublicPostLike(note) &&
            contentLinksToNote(normalizedSlug, [note.summary, note.content]),
        )
        .map((note) => ({
          id: note.id,
          title: note.title,
          href: `/notes/${note.slug}`,
          kindLabel: "Note",
          summary: note.summary,
          publishedAt: note.publishedAt!,
        })),
      ...demoJournalEntries
        .filter(
          (entry) =>
            isPublicJournalLike(entry) &&
            contentLinksToNote(normalizedSlug, [entry.summary, entry.content]),
        )
        .map((entry) => ({
          id: entry.id,
          title: entry.title,
          href: "/journal",
          kindLabel: "Journal entry",
          summary: entry.summary,
          publishedAt: entry.publishedAt,
        })),
      ...demoWeeklyDigests
        .filter(
          (digest) =>
            isLivePublishedAt(digest.publishedAt) &&
            contentLinksToNote(normalizedSlug, [digest.summary, digest.content, digest.highlights.join("\n")]),
        )
        .map((digest) => ({
          id: digest.id,
          title: digest.title,
          href: `/digest/${digest.slug}`,
          kindLabel: "Weekly digest",
          summary: digest.summary,
          publishedAt: digest.publishedAt,
        })),
    ];

    return backlinks.sort(sortBacklinksByRecency);
  }

  const cutoff = getPublishingCutoff();
  const target = `/notes/${normalizedSlug}`;

  const [posts, notes, journals, digests] = await Promise.all([
    prisma.post.findMany({
      where: {
        ...publicPostWhere(cutoff),
        OR: [{ excerpt: containsText(target) }, { content: containsText(target) }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        publishedAt: true,
      },
    }),
    prisma.note.findMany({
      where: {
        ...publicNoteWhere(cutoff),
        slug: { not: normalizedSlug },
        OR: [{ summary: containsText(target) }, { content: containsText(target) }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        publishedAt: true,
      },
    }),
    prisma.journalEntry.findMany({
      where: {
        ...publicJournalWhere(cutoff),
        OR: [{ summary: containsText(target) }, { content: containsText(target) }],
      },
      select: {
        id: true,
        title: true,
        summary: true,
        content: true,
        publishedAt: true,
      },
    }),
    prisma.weeklyDigest.findMany({
      where: {
        ...publicWeeklyDigestWhere(cutoff),
        OR: [{ summary: containsText(target) }, { content: containsText(target) }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        publishedAt: true,
      },
    }),
  ]);

  return [
    ...posts
      .filter((post) => post.publishedAt && contentLinksToNote(normalizedSlug, [post.excerpt, post.content]))
      .map((post) => ({
        id: post.id,
        title: post.title,
        href: `/blog/${post.slug}`,
        kindLabel: "Blog post",
        summary: post.excerpt,
        publishedAt: post.publishedAt!,
      })),
    ...notes
      .filter((note) => note.publishedAt && contentLinksToNote(normalizedSlug, [note.summary, note.content]))
      .map((note) => ({
        id: note.id,
        title: note.title,
        href: `/notes/${note.slug}`,
        kindLabel: "Note",
        summary: note.summary,
        publishedAt: note.publishedAt!,
      })),
    ...journals
      .filter((entry) => contentLinksToNote(normalizedSlug, [entry.summary, entry.content]))
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        href: "/journal",
        kindLabel: "Journal entry",
        summary: entry.summary,
        publishedAt: entry.publishedAt,
      })),
    ...digests
      .filter((digest) => contentLinksToNote(normalizedSlug, [digest.summary, digest.content]))
      .map((digest) => ({
        id: digest.id,
        title: digest.title,
        href: `/digest/${digest.slug}`,
        kindLabel: "Weekly digest",
        summary: digest.summary,
        publishedAt: digest.publishedAt,
      })),
  ].sort(sortBacklinksByRecency);
}

export async function getRecentJournalEntries(limit = 4) {
  if (!isDatabaseConfigured()) {
    return demoJournalEntries.filter((entry) => isPublicJournalLike(entry)).slice(0, limit);
  }

  const cutoff = getPublishingCutoff();
  return prisma.journalEntry.findMany({
    where: publicJournalWhere(cutoff),
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
      series: 0,
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
    series,
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
    prisma.contentSeries.count(),
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
    series,
  };
}

export async function getAdminContentSeries() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.contentSeries.findMany({
    include: {
      _count: {
        select: {
          posts: true,
          notes: true,
          weeklyDigests: true,
        },
      },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getAdminContentSeriesById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.contentSeries.findUnique({
    where: { id },
    include: {
      posts: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          seriesOrder: true,
        },
        orderBy: [{ seriesOrder: "asc" }, { publishedAt: "asc" }],
      },
      notes: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          seriesOrder: true,
        },
        orderBy: [{ seriesOrder: "asc" }, { publishedAt: "asc" }],
      },
      weeklyDigests: {
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          seriesOrder: true,
        },
        orderBy: [{ seriesOrder: "asc" }, { publishedAt: "asc" }],
      },
      _count: {
        select: {
          posts: true,
          notes: true,
          weeklyDigests: true,
        },
      },
    },
  });
}

export async function getAdminSeriesOptions() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.contentSeries.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      featured: true,
    },
    orderBy: [{ featured: "desc" }, { title: "asc" }],
  });
}

export async function getAdminPosts() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.post.findMany({
    include: { author: true, _count: { select: { comments: true } } },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getAdminPostById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.post.findUnique({ where: { id } });
}

export async function getAdminPostRevisionHistory(postId: string, limit = 12) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.postRevision.findMany({
    where: { postId },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
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

export async function getAdminNoteRevisionHistory(noteId: string, limit = 12) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.noteRevision.findMany({
    where: { noteId },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
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

  const repliesSupported = hasCommentReplySupport();

  if (!repliesSupported) {
    const comments = await prisma.comment.findMany({
      include: { author: true, post: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return comments.map((comment) => ({
      ...comment,
      parent: null,
    }));
  }

  return prisma.comment.findMany({
    include: {
      author: true,
      post: true,
      parent: {
        select: {
          id: true,
          content: true,
          status: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCommentModerationRules() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.commentModerationRule.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ enabled: "desc" }, { mode: "asc" }, { severity: "desc" }, { term: "asc" }],
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
          parentId: true,
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

  return (await normalizeSiteProfileRecord(
    await prisma.siteProfile.findUnique({ where: { id: "main" } }),
  )) ?? demoProfile;
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
    return demoWeeklyDigests.filter((digest) => isLivePublishedAt(digest.publishedAt)).slice(0, limit);
  }

  const cutoff = getPublishingCutoff();
  return prisma.weeklyDigest.findMany({
    where: publicWeeklyDigestWhere(cutoff),
    orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
}

export async function getLatestWeeklyDigest() {
  if (!isDatabaseConfigured()) {
    return demoWeeklyDigests.find((digest) => isLivePublishedAt(digest.publishedAt)) ?? null;
  }

  const cutoff = getPublishingCutoff();
  return prisma.weeklyDigest.findFirst({
    where: publicWeeklyDigestWhere(cutoff),
    orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
  });
}

export async function getWeeklyDigestBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    const digest = demoWeeklyDigests.find((entry) => entry.slug === slug) ?? null;
    return digest && isLivePublishedAt(digest.publishedAt)
      ? {
          ...digest,
          seriesId: null,
          seriesOrder: null,
          series: null,
        }
      : null;
  }

  const cutoff = getPublishingCutoff();

  return prisma.weeklyDigest.findFirst({
    where: {
      slug,
      ...publicWeeklyDigestWhere(cutoff),
    },
    include: {
      series: true,
    },
  });
}

export async function getAdminWeeklyDigests() {
  if (!isDatabaseConfigured()) {
    return demoWeeklyDigests.map((digest) => ({
      ...digest,
      seriesId: null,
      seriesOrder: null,
      series: null,
    }));
  }

  return prisma.weeklyDigest.findMany({
    include: {
      series: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
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
        isPublicPostLike(post) &&
        matchesSearch(normalized, [
          post.title,
          post.excerpt,
          post.content,
          post.category,
          post.tags.join(" "),
        ]),
      )
      .slice(0, limitPerType);
    const notes = demoNotes
      .filter((note) =>
        isPublicPostLike(note) &&
        matchesSearch(normalized, [
          note.title,
          note.summary,
          note.content,
          note.noteType,
          note.tags.join(" "),
        ]),
      )
      .slice(0, limitPerType);
    const journalEntries = demoJournalEntries
      .filter((entry) =>
        isPublicJournalLike(entry) &&
        matchesSearch(normalized, [entry.title, entry.summary, entry.content, entry.mood]),
      )
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
        isLivePublishedAt(digest.publishedAt) &&
        matchesSearch(normalized, [
          digest.title,
          digest.summary,
          digest.content,
          digest.highlights.join(" "),
          digest.featuredTopics.join(" "),
        ]),
      )
      .slice(0, limitPerType);

    const result = {
      posts,
      notes,
      journalEntries,
      paperEntries,
      weeklyDigests,
      total:
        posts.length +
        notes.length +
        journalEntries.length +
        paperEntries.length +
        weeklyDigests.length,
    };

    await recordSearchQuery(normalized, result.total);
    return result;
  }

  const cutoff = getPublishingCutoff();
  const [posts, notes, journalEntries, paperEntries, weeklyDigests] = await Promise.all([
    prisma.post.findMany({
      where: {
        ...publicPostWhere(cutoff),
        OR: [
          { title: containsText(normalized) },
          { excerpt: containsText(normalized) },
          { content: containsText(normalized) },
          { category: containsText(normalized) },
          { tags: { has: normalized } },
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
        ...publicNoteWhere(cutoff),
        OR: [
          { title: containsText(normalized) },
          { summary: containsText(normalized) },
          { content: containsText(normalized) },
          { noteType: containsText(normalized) },
          { tags: { has: normalized } },
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
        ...publicJournalWhere(cutoff),
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
        ...publicWeeklyDigestWhere(cutoff),
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

  const result = {
    posts,
    notes,
    journalEntries,
    paperEntries,
    weeklyDigests,
    total:
      posts.length +
      notes.length +
      journalEntries.length +
      paperEntries.length +
      weeklyDigests.length,
  };

  await recordSearchQuery(normalized, result.total);
  return result;
}

export async function getSitemapEntries() {
  const staticPages = [
    "/",
    "/archive",
    "/blog",
    "/categories",
    "/journal",
    "/notes",
    "/papers",
    "/digest",
    "/series",
    "/search",
    "/tags",
    "/login",
    "/register",
  ];

  if (!isDatabaseConfigured()) {
    const visiblePosts = demoPosts.filter((post) => isPublicPostLike(post));
    const visibleNotes = demoNotes.filter((note) => isPublicPostLike(note));
    const visibleJournalEntries = demoJournalEntries.filter((entry) => isPublicJournalLike(entry));
    const visibleDigests = demoWeeklyDigests.filter((digest) => isLivePublishedAt(digest.publishedAt));
    const tagEntries = buildTagArchiveData(visiblePosts, visibleNotes).map((item) => item.tag);
    const categoryEntries = buildCategoryArchiveData(visiblePosts).map((item) => item.category);

    return {
      staticPages,
      posts: visiblePosts.map((post) => post.slug),
      notes: visibleNotes.map((note) => note.slug),
      journal: visibleJournalEntries.map((entry) => entry.slug),
      digests: visibleDigests.map((digest) => digest.slug),
      series: [],
      tags: tagEntries,
      categories: categoryEntries,
    };
  }

  const cutoff = getPublishingCutoff();
  const [posts, notes, journal, digests, series, tags, categories] = await Promise.all([
    prisma.post.findMany({ where: publicPostWhere(cutoff), select: { slug: true } }),
    prisma.note.findMany({ where: publicNoteWhere(cutoff), select: { slug: true } }),
    prisma.journalEntry.findMany({
      where: publicJournalWhere(cutoff),
      select: { slug: true },
    }),
    prisma.weeklyDigest.findMany({ where: publicWeeklyDigestWhere(cutoff), select: { slug: true } }),
    prisma.contentSeries.findMany({
      where: {
        OR: [
          { posts: { some: publicPostWhere(cutoff) } },
          { notes: { some: publicNoteWhere(cutoff) } },
          { weeklyDigests: { some: publicWeeklyDigestWhere(cutoff) } },
        ],
      },
      select: { slug: true },
    }),
    getTagArchive(),
    getCategoryArchive(),
  ]);

  return {
    staticPages,
    posts: posts.map((post) => post.slug),
    notes: notes.map((note) => note.slug),
    journal: journal.map((entry) => entry.slug),
    digests: digests.map((digest) => digest.slug),
    series: series.map((item) => item.slug),
    tags: tags.map((item) => item.tag),
    categories: categories.map((item) => item.category),
  };
}

export function isAdminUser(role: UserRole | string | undefined) {
  return role === UserRole.ADMIN || role === "ADMIN";
}

async function resolveSiteLaunchDate() {
  const configuredLaunchDate = process.env.SITE_LAUNCHED_AT
    ? new Date(process.env.SITE_LAUNCHED_AT)
    : null;

  if (configuredLaunchDate && !Number.isNaN(configuredLaunchDate.getTime())) {
    return configuredLaunchDate;
  }

  const [firstPost, firstNote, firstJournalEntry, firstDigest, firstVisitor] = await Promise.all([
    prisma.post.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.note.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.journalEntry.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.weeklyDigest.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.siteVisitor.findFirst({
      orderBy: { firstSeenAt: "asc" },
      select: { firstSeenAt: true },
    }),
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
