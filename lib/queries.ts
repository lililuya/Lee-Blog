import {
  CommentStatus,
  PaperReadingStatus,
  PostStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import {
  extractMarkdownCitationCards,
  getCanonicalArxivId,
  getCanonicalPaperReferenceKey,
  getCanonicalPaperUrl,
  getPaperCitationLookupKeys,
} from "@/lib/citation-cards";
import {
  hasCommentGuestIdentitySupport,
  hasCommentReplySupport,
  hasGalleryAlbumSupport,
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
import { resolveCommentAuthorIdentity } from "@/lib/comment-identity";
import { DEFAULT_CONTENT_LANGUAGE } from "@/lib/content-language";
import { getUserPaperLibrary } from "@/lib/paper-library-queries";
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

type AdminPostCategoryItem = {
  category: string;
  normalizedCategory: string;
  totalPosts: number;
  publishedPosts: number;
  subscriberCount: number;
  latestPublishedAt: Date | null;
  latestUpdatedAt: Date | null;
  recentPosts: Array<{
    id: string;
    title: string;
    slug: string;
    status: PostStatus;
    publishedAt: Date | null;
  }>;
};

type RecentComment = {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
    isAdmin: boolean;
    isGuest: boolean;
  };
  post: {
    title: string;
    slug: string;
  };
};

type ResolvedCommentAuthor = ReturnType<typeof resolveCommentAuthorIdentity>;

type PublicCommentRecord = {
  id: string;
  content: string;
  status: CommentStatus | string;
  moderationNotes: string | null;
  moderationMatches: string[];
  createdAt: Date;
  updatedAt: Date;
  postId: string;
  authorId: string | null;
  parentId: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  author?: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: UserRole | string;
  } | null;
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

type SubscriptionPreferenceCount = {
  label: string;
  count: number;
};

type SubscriptionRecentSubscriber = {
  id: string;
  email: string;
  name: string | null;
  status: "active" | "pending" | "expired" | "unsubscribed";
  postNotificationsEnabled: boolean;
  digestNotificationsEnabled: boolean;
  categories: string[];
  tags: string[];
  createdAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  notificationCount: number;
  lastNotifiedAt: Date | null;
  digestNotificationCount: number;
  lastDigestNotifiedAt: Date | null;
};

const archiveMonthFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
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

type PostLanguageAlternate = {
  id: string;
  title: string;
  slug: string;
  language: string;
  publishedAt: Date | null;
  isPrimary: boolean;
};

type ReferencedNoteSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  noteType: string | null;
  publishedAt: Date | null;
};

type ReferencedPaperSummary = {
  key: string;
  title: string;
  authors: string[];
  url: string | null;
  arxivId: string | null;
  year: string | null;
  note: string | null;
};

type PublicPaperFlowReference = {
  id: string;
  kindLabel: string;
  href: string;
  title: string;
  summary: string;
  publishedAt: Date;
  matchedCards: number;
};

type PublicResearchReadingItem = {
  id: string;
  arxivId: string;
  title: string;
  summary: string;
  authors: string[];
  paperUrl: string;
  pdfUrl: string | null;
  primaryCategory: string | null;
  topicName: string | null;
  status: PaperReadingStatus | string;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
  lastReadAt: Date | null;
  completedAt: Date | null;
  annotationCount: number;
  latestQuote: string | null;
  latestNote: string | null;
  latestHighlightAt: Date | null;
  usageCount: number;
  usageReferences: PublicPaperFlowReference[];
};

type PublicResearchReadingHighlight = {
  id: string;
  arxivId: string;
  title: string;
  authors: string[];
  paperUrl: string;
  quote: string;
  note: string | null;
  createdAt: Date;
  usageCount: number;
};

type PublicResearchReadingData = {
  owner: {
    name: string;
    avatarUrl: string | null;
  };
  counts: {
    saved: number;
    queued: number;
    reading: number;
    completed: number;
    archived: number;
    annotations: number;
    highlights: number;
    promotedPapers: number;
    promotedEntries: number;
  };
  continueReading: PublicResearchReadingItem[];
  queuedPapers: PublicResearchReadingItem[];
  completedPapers: PublicResearchReadingItem[];
  promotedPapers: PublicResearchReadingItem[];
  recentHighlights: PublicResearchReadingHighlight[];
};

type PaperFlowSourceAnnotation = {
  id: string;
  content: string;
  quote: string | null;
  createdAt: Date;
};

type PaperFlowSourceItem = {
  id: string;
  arxivId: string;
  title: string;
  summary: string;
  authors: string[];
  paperUrl: string;
  pdfUrl: string | null;
  primaryCategory: string | null;
  topicName: string | null;
  status: PaperReadingStatus | string;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
  lastReadAt: Date | null;
  completedAt: Date | null;
  annotationCount: number;
  annotations: PaperFlowSourceAnnotation[];
};

type PaperFlowContentCandidate = {
  id: string;
  kindLabel: string;
  href: string;
  title: string;
  summary: string;
  content: string;
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

function decodeTaxonomyValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return decodeURIComponent(trimmed.replace(/\+/g, "%20"));
  } catch {
    return trimmed;
  }
}

function normalizeTaxonomyValue(value: string) {
  return decodeTaxonomyValue(value).trim().toLowerCase();
}

function buildSubscriptionPreferenceCounts(
  subscribers: Array<{ categories: string[]; tags: string[] }>,
  field: "categories" | "tags",
  limit = 8,
) {
  const counts = new Map<string, SubscriptionPreferenceCount>();

  for (const subscriber of subscribers) {
    const seen = new Set<string>();

    for (const rawValue of subscriber[field]) {
      const value = rawValue.trim();
      const normalized = normalizeTaxonomyValue(value);

      if (!value || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      const current = counts.get(normalized) ?? {
        label: value,
        count: 0,
      };
      current.label = current.label.length >= value.length ? current.label : value;
      current.count += 1;
      counts.set(normalized, current);
    }
  }

  return [...counts.values()]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, "zh-CN");
    })
    .slice(0, limit);
}

function resolveSubscriptionStatus(subscriber: {
  isActive: boolean;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  confirmationToken: string | null;
  confirmationExpiresAt: Date | null;
}) {
  if (subscriber.isActive && subscriber.confirmedAt && !subscriber.unsubscribedAt) {
    return "active" as const;
  }

  if (subscriber.unsubscribedAt) {
    return "unsubscribed" as const;
  }

  if (
    subscriber.confirmationToken &&
    subscriber.confirmationExpiresAt &&
    subscriber.confirmationExpiresAt.getTime() < Date.now()
  ) {
    return "expired" as const;
  }

  return "pending" as const;
}

function normalizeNoteSlugCandidate(value: string | null | undefined) {
  const rawValue = (value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    return decodeURIComponent(rawValue).trim().toLowerCase();
  } catch {
    return rawValue.toLowerCase();
  }
}

function extractNoteReferenceSlugsFromValue(value: string | null | undefined) {
  const text = value ?? "";
  const matches = text.matchAll(/(?:https?:\/\/[^\s)<>"']+)?\/notes\/([^)\s<>"'#?]+)/gi);
  const slugs: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const normalizedSlug = normalizeNoteSlugCandidate(match[1]);

    if (!normalizedSlug || seen.has(normalizedSlug)) {
      continue;
    }

    seen.add(normalizedSlug);
    slugs.push(normalizedSlug);
  }

  return slugs;
}

function contentLinksToNote(
  noteSlug: string,
  values: Array<string | null | undefined>,
) {
  const normalizedSlug = normalizeNoteSlugCandidate(noteSlug);

  if (!normalizedSlug) {
    return false;
  }

  return values.some((value) => extractNoteReferenceSlugsFromValue(value).includes(normalizedSlug));
}

function sortBacklinksByRecency(left: NoteBacklink, right: NoteBacklink) {
  const timeDifference = right.publishedAt.getTime() - left.publishedAt.getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function getPostTranslationRootId(post: {
  id: string;
  translationOfId?: string | null;
}) {
  return post.translationOfId ?? post.id;
}

function sortPostLanguageAlternates(left: PostLanguageAlternate, right: PostLanguageAlternate) {
  if (left.isPrimary !== right.isPrimary) {
    return left.isPrimary ? -1 : 1;
  }

  const leftTime = left.publishedAt?.getTime() ?? 0;
  const rightTime = right.publishedAt?.getTime() ?? 0;

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function extractReferencedNoteSlugs(content: string) {
  return extractNoteReferenceSlugsFromValue(content);
}

function buildReferencedPaperSummaries(content: string): ReferencedPaperSummary[] {
  const references = new Map<string, ReferencedPaperSummary>();

  for (const card of extractMarkdownCitationCards(content)) {
    const key = getCanonicalPaperReferenceKey({
      arxivId: card.arxivId,
      url: card.url,
      title: card.title,
    });

    if (!key) {
      continue;
    }

    const authors = (card.authors ?? "")
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean);

    const existingReference = references.get(key);

    if (existingReference) {
      if (existingReference.authors.length === 0 && authors.length > 0) {
        existingReference.authors = authors;
      }

      if (!existingReference.url && card.url) {
        existingReference.url = card.url;
      }

      if (!existingReference.arxivId && card.arxivId) {
        existingReference.arxivId = card.arxivId;
      }

      if (!existingReference.year && card.year) {
        existingReference.year = card.year;
      }

      if (!existingReference.note && card.note) {
        existingReference.note = card.note;
      }

      continue;
    }

    references.set(key, {
      key,
      title: card.title,
      authors,
      url: card.url ?? null,
      arxivId: card.arxivId ?? null,
      year: card.year ?? null,
      note: card.note ?? null,
    });
  }

  return Array.from(references.values());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contentIncludesExactToken(content: string, token: string) {
  if (!token) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}(?=$|[^a-z0-9])`, "i");
  return pattern.test(content);
}

function contentReferencesPaperCandidate(
  normalizedContent: string,
  normalizedUrlContent: string,
  input: {
    arxivId: string;
    paperUrl: string;
    pdfUrl: string | null;
  },
) {
  const canonicalArxivId =
    getCanonicalArxivId(input.arxivId) ??
    getCanonicalArxivId(input.paperUrl) ??
    getCanonicalArxivId(input.pdfUrl);

  if (canonicalArxivId) {
    const arxivPattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(canonicalArxivId)}(?:v\\d+)?(?=$|[^a-z0-9])`,
      "i",
    );

    if (arxivPattern.test(normalizedContent)) {
      return true;
    }
  }

  const exactUrls = [input.paperUrl, input.pdfUrl]
    .map((value) => getCanonicalPaperUrl(value))
    .filter(
      (value): value is string =>
        typeof value === "string" && !value.startsWith("arxiv.org/abs/"),
    );

  return exactUrls.some((url) => contentIncludesExactToken(normalizedUrlContent, url));
}

function sortResearchItemsByRecentActivity(
  left: Pick<PublicResearchReadingItem, "lastReadAt" | "updatedAt" | "title">,
  right: Pick<PublicResearchReadingItem, "lastReadAt" | "updatedAt" | "title">,
) {
  const rightTime = new Date(right.lastReadAt ?? right.updatedAt).getTime();
  const leftTime = new Date(left.lastReadAt ?? left.updatedAt).getTime();

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function sortResearchItemsByCompletion(
  left: Pick<PublicResearchReadingItem, "completedAt" | "updatedAt" | "title">,
  right: Pick<PublicResearchReadingItem, "completedAt" | "updatedAt" | "title">,
) {
  const rightTime = new Date(right.completedAt ?? right.updatedAt).getTime();
  const leftTime = new Date(left.completedAt ?? left.updatedAt).getTime();

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function sortPaperFlowReferences(left: PublicPaperFlowReference, right: PublicPaperFlowReference) {
  const timeDifference = right.publishedAt.getTime() - left.publishedAt.getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function collectPaperFlowReferences(
  items: PaperFlowSourceItem[],
  contentCandidates: PaperFlowContentCandidate[],
) {
  const usageMap = new Map<string, PublicPaperFlowReference[]>();
  const lookupMap = new Map<string, string[]>();

  for (const item of items) {
    usageMap.set(item.id, []);

    for (const key of getPaperCitationLookupKeys({
      arxivId: item.arxivId,
      url: item.paperUrl,
      title: item.title,
    })) {
      const current = lookupMap.get(key) ?? [];
      current.push(item.id);
      lookupMap.set(key, current);
    }
  }

  for (const candidate of contentCandidates) {
    const lowerContent = candidate.content.toLowerCase();
    const lowerUrlContent = lowerContent.replace(/https?:\/\//g, "");
    const matchedCounts = new Map<string, number>();

    for (const card of extractMarkdownCitationCards(candidate.content)) {
      const matchedItemIds = new Set<string>();

      for (const key of getPaperCitationLookupKeys({
        arxivId: card.arxivId,
        url: card.url,
        title: card.title,
      })) {
        const matchedIds = lookupMap.get(key);

        if (!matchedIds) {
          continue;
        }

        for (const matchedId of matchedIds) {
          matchedItemIds.add(matchedId);
        }
      }

      for (const matchedId of matchedItemIds) {
        matchedCounts.set(matchedId, (matchedCounts.get(matchedId) ?? 0) + 1);
      }
    }

    for (const item of items) {
      if (matchedCounts.has(item.id)) {
        continue;
      }

      if (
        contentReferencesPaperCandidate(lowerContent, lowerUrlContent, {
          arxivId: item.arxivId,
          paperUrl: item.paperUrl,
          pdfUrl: item.pdfUrl,
        })
      ) {
        matchedCounts.set(item.id, 1);
      }
    }

    for (const [itemId, matchedCards] of matchedCounts.entries()) {
      const references = usageMap.get(itemId);

      if (!references) {
        continue;
      }

      references.push({
        id: candidate.id,
        kindLabel: candidate.kindLabel,
        href: candidate.href,
        title: candidate.title,
        summary: candidate.summary,
        publishedAt: candidate.publishedAt,
        matchedCards,
      });
    }
  }

  for (const references of usageMap.values()) {
    references.sort(sortPaperFlowReferences);
  }

  return usageMap;
}

function buildPublicResearchReadingData(args: {
  owner: {
    name: string;
    avatarUrl: string | null;
  };
  items: PaperFlowSourceItem[];
  contentCandidates: PaperFlowContentCandidate[];
}): PublicResearchReadingData {
  const usageMap = collectPaperFlowReferences(args.items, args.contentCandidates);

  const mappedItems: PublicResearchReadingItem[] = args.items.map((item) => {
    const usageReferences = usageMap.get(item.id) ?? [];
    const highlight = item.annotations.find((annotation) => Boolean(annotation.quote?.trim())) ?? null;

    return {
      ...item,
      latestQuote: highlight?.quote?.trim() ?? null,
      latestNote: highlight?.content.trim() || null,
      latestHighlightAt: highlight?.createdAt ?? null,
      usageCount: usageReferences.length,
      usageReferences,
    };
  });

  const highlightEntries = args.items
    .flatMap((item) =>
      item.annotations
        .filter((annotation) => Boolean(annotation.quote?.trim()))
        .map((annotation) => ({
          id: annotation.id,
          arxivId: item.arxivId,
          title: item.title,
          authors: item.authors,
          paperUrl: item.paperUrl,
          quote: annotation.quote!.trim(),
          note: annotation.content.trim() || null,
          createdAt: annotation.createdAt,
          usageCount: (usageMap.get(item.id) ?? []).length,
        })),
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return {
    owner: args.owner,
    counts: {
      saved: mappedItems.length,
      queued: mappedItems.filter((item) => item.status === PaperReadingStatus.TO_READ).length,
      reading: mappedItems.filter((item) => item.status === PaperReadingStatus.READING).length,
      completed: mappedItems.filter((item) => item.status === PaperReadingStatus.COMPLETED).length,
      archived: mappedItems.filter((item) => item.status === PaperReadingStatus.ARCHIVED).length,
      annotations: mappedItems.reduce((sum, item) => sum + item.annotationCount, 0),
      highlights: highlightEntries.length,
      promotedPapers: mappedItems.filter((item) => item.usageCount > 0).length,
      promotedEntries: mappedItems.reduce((sum, item) => sum + item.usageCount, 0),
    },
    continueReading: [...mappedItems]
      .filter(
        (item) =>
          item.status === PaperReadingStatus.READING ||
          (item.progressPercent > 0 && item.progressPercent < 100),
      )
      .sort(sortResearchItemsByRecentActivity)
      .slice(0, 4),
    queuedPapers: [...mappedItems]
      .filter((item) => item.status === PaperReadingStatus.TO_READ)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 6),
    completedPapers: [...mappedItems]
      .filter((item) => item.status === PaperReadingStatus.COMPLETED)
      .sort(sortResearchItemsByCompletion)
      .slice(0, 4),
    promotedPapers: [...mappedItems]
      .filter((item) => item.usageCount > 0)
      .sort((left, right) => {
        const leftTime = left.usageReferences[0]?.publishedAt.getTime() ?? 0;
        const rightTime = right.usageReferences[0]?.publishedAt.getTime() ?? 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        if (right.usageCount !== left.usageCount) {
          return right.usageCount - left.usageCount;
        }

        return left.title.localeCompare(right.title, "zh-CN");
      })
      .slice(0, 6),
    recentHighlights: highlightEntries.slice(0, 6),
  };
}

function buildDemoPublicResearchReadingData(owner: {
  name: string;
  avatarUrl: string | null;
}): PublicResearchReadingData {
  const demoItems: PaperFlowSourceItem[] = demoPaperEntries.slice(0, 2).map((entry, index) => ({
    id: `demo-library-${entry.id}`,
    arxivId: entry.arxivId,
    title: entry.title,
    summary: entry.summary,
    authors: entry.authors,
    paperUrl: entry.paperUrl,
    pdfUrl: entry.pdfUrl ?? null,
    primaryCategory: entry.primaryCategory ?? null,
    topicName: entry.topic.name,
    status: index === 0 ? PaperReadingStatus.READING : PaperReadingStatus.COMPLETED,
    progressPercent: index === 0 ? 46 : 100,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    lastReadAt: index === 0 ? entry.updatedAt : new Date(entry.updatedAt.getTime() - 1000 * 60 * 90),
    completedAt: index === 0 ? null : entry.updatedAt,
    annotationCount: 1,
    annotations: [
      {
        id: `demo-annotation-${entry.id}`,
        content:
          index === 0
            ? "Useful for thinking about transparent tool calls and intermediate state in agent workflows."
            : "A clean framing for evaluation loops that can be turned into a checklist note or an implementation review post.",
        quote:
          index === 0
            ? "Expose intermediate tool calls and state transitions so users can audit the workflow."
            : "Evaluation should separate retrieval failure from answer failure before teams optimize the wrong component.",
        createdAt: entry.updatedAt,
      },
    ],
  }));

  const demoContentCandidates: PaperFlowContentCandidate[] = [
    ...demoPosts
      .filter((post) => isPublicPostLike(post))
      .map((post) => ({
        id: post.id,
        kindLabel: "Blog post",
        href: `/blog/${post.slug}`,
        title: post.title,
        summary: post.excerpt,
        content: post.content,
        publishedAt: post.publishedAt!,
      })),
    ...demoNotes
      .filter((note) => isPublicPostLike(note))
      .map((note) => ({
        id: note.id,
        kindLabel: "Note",
        href: `/notes/${note.slug}`,
        title: note.title,
        summary: note.summary,
        content: note.content,
        publishedAt: note.publishedAt!,
      })),
    ...demoWeeklyDigests
      .filter((digest) => isLivePublishedAt(digest.publishedAt))
      .map((digest) => ({
        id: digest.id,
        kindLabel: "Weekly digest",
        href: `/digest/${digest.slug}`,
        title: digest.title,
        summary: digest.summary,
        content: [digest.summary, digest.content, digest.highlights.join("\n")].join("\n"),
        publishedAt: digest.publishedAt,
      })),
  ];

  return buildPublicResearchReadingData({
    owner,
    items: demoItems,
    contentCandidates: demoContentCandidates,
  });
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

function mapCommentAuthor(input: {
  guestName?: string | null;
  guestEmail?: string | null;
  author?: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: UserRole | string;
  } | null;
}): ResolvedCommentAuthor {
  return resolveCommentAuthorIdentity({
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    author: input.author
      ? {
          ...input.author,
          role: input.author.role ?? null,
        }
      : null,
  });
}

function mapPublicComment(comment: PublicCommentRecord) {
  return {
    ...comment,
    author: mapCommentAuthor(comment),
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
  translationRootId?: string | null;
}) {
  const posts = await getPublishedPosts();
  const normalizedCategory = normalizeTaxonomyValue(input.category);
  const normalizedTags = new Set(
    input.tags.map((tag) => normalizeTaxonomyValue(tag)).filter(Boolean),
  );
  const visiblePosts = posts.filter((post) => {
    if (post.id === input.postId) {
      return true;
    }

    if (!input.translationRootId) {
      return true;
    }

    return getPostTranslationRootId(post) !== input.translationRootId;
  });

  const chronologicalPosts = [...visiblePosts].sort((left, right) => {
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

  const relatedPosts = visiblePosts
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
          author: mapCommentAuthor(comment),
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
  const guestIdentitySupported = hasCommentGuestIdentitySupport();
  const cutoff = getPublishingCutoff();

  const commentSelect = guestIdentitySupported
    ? {
        id: true,
        content: true,
        createdAt: true,
        guestName: true,
        guestEmail: true,
        author: {
          select: {
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
        post: {
          select: {
            title: true,
            slug: true,
          },
        },
      }
    : {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
        post: {
          select: {
            title: true,
            slug: true,
          },
        },
      };

  return prisma.comment.findMany({
    where: {
      status: CommentStatus.APPROVED,
      ...(repliesSupported ? { parentId: null } : {}),
      post: publicPostWhere(cutoff),
    },
    select: commentSelect,
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  }).then((comments) =>
    comments.map((comment) => ({
      ...comment,
      author: mapCommentAuthor(comment),
    })),
  );
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
          .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
          .map((comment) => mapPublicComment(comment)),
    };
  }

  const repliesSupported = hasCommentReplySupport();
  const guestIdentitySupported = hasCommentGuestIdentitySupport();
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
      comments: post.comments.map((comment) =>
        mapPublicComment({
          ...comment,
          status: comment.status,
          moderationNotes: comment.moderationNotes,
          moderationMatches: comment.moderationMatches,
          authorId: comment.authorId,
          parentId: null,
        }),
      ),
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
          select: guestIdentitySupported
            ? {
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
                guestName: true,
                guestEmail: true,
                author: {
                  select: {
                    name: true,
                    email: true,
                    avatarUrl: true,
                    role: true,
                  },
                },
              }
            : {
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
                author: {
                  select: {
                    name: true,
                    email: true,
                    avatarUrl: true,
                    role: true,
                  },
                },
              },
          orderBy: { createdAt: "asc" },
        },
      },
  }).then((post) =>
    post
      ? {
          ...post,
          comments: post.comments.map((comment) => mapPublicComment(comment)),
        }
      : null,
  );
}

export async function getPostLanguageAlternates(
  postId: string,
  translationOfId?: string | null,
) {
  const baseId = translationOfId ?? postId;

  if (!baseId) {
    return [] as PostLanguageAlternate[];
  }

  if (!isDatabaseConfigured()) {
    return demoPosts
      .filter(
        (post) =>
          isPublicPostLike(post) &&
          (post.id === baseId || (post.translationOfId ?? null) === baseId),
      )
      .map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        language: post.language ?? DEFAULT_CONTENT_LANGUAGE,
        publishedAt: post.publishedAt ?? null,
        isPrimary: post.id === baseId,
      }))
      .sort(sortPostLanguageAlternates);
  }

  const cutoff = getPublishingCutoff();

  const alternates = await prisma.post.findMany({
    where: {
      ...publicPostWhere(cutoff),
      OR: [{ id: baseId }, { translationOfId: baseId }],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      language: true,
      translationOfId: true,
      publishedAt: true,
    },
  });

  return alternates
    .map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      language: post.language || DEFAULT_CONTENT_LANGUAGE,
      publishedAt: post.publishedAt,
      isPrimary: post.id === baseId,
    }))
    .sort(sortPostLanguageAlternates);
}

export async function getPostKnowledgeNetwork(content: string) {
  const referencedPapers = buildReferencedPaperSummaries(content);
  const noteSlugs = extractReferencedNoteSlugs(content);

  if (!isDatabaseConfigured()) {
    return {
      notes: demoNotes
        .filter(
          (note) => isPublicPostLike(note) && noteSlugs.includes(note.slug),
        )
        .map((note) => ({
          id: note.id,
          title: note.title,
          slug: note.slug,
          summary: note.summary,
          noteType: note.noteType ?? null,
          publishedAt: note.publishedAt ?? null,
        })),
      papers: referencedPapers,
    };
  }

  const cutoff = getPublishingCutoff();
  const notes =
    noteSlugs.length > 0
      ? await prisma.note.findMany({
          where: {
            ...publicNoteWhere(cutoff),
            slug: { in: noteSlugs },
          },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            noteType: true,
            publishedAt: true,
          },
        })
      : [];

  const notesBySlug = new Map(notes.map((note) => [note.slug, note]));
  const orderedNotes: ReferencedNoteSummary[] = noteSlugs
    .map((slug) => notesBySlug.get(slug))
    .filter((note): note is (typeof notes)[number] => Boolean(note))
    .map((note) => ({
      id: note.id,
      title: note.title,
      slug: note.slug,
      summary: note.summary,
      noteType: note.noteType ?? null,
      publishedAt: note.publishedAt,
    }));

  return {
    notes: orderedNotes,
    papers: referencedPapers,
  };
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
          href: `/journal/${entry.slug}`,
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
        slug: true,
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
        href: `/journal/${entry.slug}`,
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
    return [...demoJournalEntries]
      .filter((entry) => isPublicJournalLike(entry))
      .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime())
      .slice(0, limit);
  }

  const cutoff = getPublishingCutoff();
  return prisma.journalEntry.findMany({
    where: publicJournalWhere(cutoff),
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getJournalEntryBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    const entry = demoJournalEntries.find((item) => item.slug === slug) ?? null;
    return entry && isPublicJournalLike(entry) ? entry : null;
  }

  const cutoff = getPublishingCutoff();
  return prisma.journalEntry.findFirst({
    where: {
      slug,
      ...publicJournalWhere(cutoff),
    },
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
      emailSubscribers: 0,
      activeEmailSubscribers: 0,
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
    emailSubscribers,
    activeEmailSubscribers,
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
    prisma.emailSubscriber.count(),
    prisma.emailSubscriber.count({
      where: {
        isActive: true,
        confirmedAt: { not: null },
        unsubscribedAt: null,
      },
    }),
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
    emailSubscribers,
    activeEmailSubscribers,
  };
}

export async function getAdminSubscriptionOverview() {
  if (!isDatabaseConfigured()) {
    return {
      totals: {
        totalSubscribers: 0,
        activeSubscribers: 0,
        pendingSubscribers: 0,
        unsubscribedSubscribers: 0,
        unsubscribeRate: 0,
        averageNotificationCount: 0,
        averageDigestNotificationCount: 0,
      },
      coverage: {
        allPostsSubscribers: 0,
        filteredSubscribers: 0,
        categoryTargetedSubscribers: 0,
        tagTargetedSubscribers: 0,
        notifiedSubscribers: 0,
        postEnabledSubscribers: 0,
        digestEnabledSubscribers: 0,
        digestNotifiedSubscribers: 0,
      },
      topCategories: [] as SubscriptionPreferenceCount[],
      topTags: [] as SubscriptionPreferenceCount[],
      recentSubscribers: [] as SubscriptionRecentSubscriber[],
      recentNotifications: [] as SubscriptionRecentSubscriber[],
    };
  }

  const subscribers = await prisma.emailSubscriber.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      postNotificationsEnabled: true,
      digestNotificationsEnabled: true,
      categories: true,
      tags: true,
      isActive: true,
      confirmedAt: true,
      unsubscribedAt: true,
      confirmationToken: true,
      confirmationExpiresAt: true,
      notificationCount: true,
      lastNotifiedAt: true,
      digestNotificationCount: true,
      lastDigestNotifiedAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const allSubscribers = subscribers.map((subscriber) => ({
    id: subscriber.id,
    email: subscriber.email,
    name: subscriber.name,
    status: resolveSubscriptionStatus(subscriber),
    postNotificationsEnabled: subscriber.postNotificationsEnabled,
    digestNotificationsEnabled: subscriber.digestNotificationsEnabled,
    categories: subscriber.categories,
    tags: subscriber.tags,
    createdAt: subscriber.createdAt,
    confirmedAt: subscriber.confirmedAt,
    unsubscribedAt: subscriber.unsubscribedAt,
    notificationCount: subscriber.notificationCount,
    lastNotifiedAt: subscriber.lastNotifiedAt,
    digestNotificationCount: subscriber.digestNotificationCount,
    lastDigestNotifiedAt: subscriber.lastDigestNotifiedAt,
  }));
  const recentSubscribers = allSubscribers.slice(0, 12);
  const activeSubscribers = allSubscribers.filter((subscriber) => subscriber.status === "active");
  const pendingSubscribers = allSubscribers.filter((subscriber) => subscriber.status === "pending");
  const unsubscribedSubscribers = allSubscribers.filter(
    (subscriber) => subscriber.status === "unsubscribed",
  );
  const postEnabledSubscribers = activeSubscribers.filter(
    (subscriber) => subscriber.postNotificationsEnabled,
  );
  const digestEnabledSubscribers = activeSubscribers.filter(
    (subscriber) => subscriber.digestNotificationsEnabled,
  );
  const allPostsSubscribers = postEnabledSubscribers.filter(
    (subscriber) => subscriber.categories.length === 0 && subscriber.tags.length === 0,
  );
  const filteredSubscribers = postEnabledSubscribers.filter(
    (subscriber) => subscriber.categories.length > 0 || subscriber.tags.length > 0,
  );
  const categoryTargetedSubscribers = postEnabledSubscribers.filter(
    (subscriber) => subscriber.categories.length > 0,
  );
  const tagTargetedSubscribers = postEnabledSubscribers.filter(
    (subscriber) => subscriber.tags.length > 0,
  );
  const notifiedSubscribers = postEnabledSubscribers.filter(
    (subscriber) => subscriber.notificationCount > 0 || subscriber.lastNotifiedAt,
  );
  const digestNotifiedSubscribers = digestEnabledSubscribers.filter(
    (subscriber) => subscriber.digestNotificationCount > 0 || subscriber.lastDigestNotifiedAt,
  );
  const totalNotificationCount = postEnabledSubscribers.reduce(
    (sum, subscriber) => sum + subscriber.notificationCount,
    0,
  );
  const totalDigestNotificationCount = digestEnabledSubscribers.reduce(
    (sum, subscriber) => sum + subscriber.digestNotificationCount,
    0,
  );

  return {
    totals: {
      totalSubscribers: subscribers.length,
      activeSubscribers: activeSubscribers.length,
      pendingSubscribers: pendingSubscribers.length,
      unsubscribedSubscribers: unsubscribedSubscribers.length,
      unsubscribeRate:
        subscribers.length > 0 ? unsubscribedSubscribers.length / subscribers.length : 0,
      averageNotificationCount:
        postEnabledSubscribers.length > 0 ? totalNotificationCount / postEnabledSubscribers.length : 0,
      averageDigestNotificationCount:
        digestEnabledSubscribers.length > 0
          ? totalDigestNotificationCount / digestEnabledSubscribers.length
          : 0,
    },
    coverage: {
      allPostsSubscribers: allPostsSubscribers.length,
      filteredSubscribers: filteredSubscribers.length,
      categoryTargetedSubscribers: categoryTargetedSubscribers.length,
      tagTargetedSubscribers: tagTargetedSubscribers.length,
      notifiedSubscribers: notifiedSubscribers.length,
      postEnabledSubscribers: postEnabledSubscribers.length,
      digestEnabledSubscribers: digestEnabledSubscribers.length,
      digestNotifiedSubscribers: digestNotifiedSubscribers.length,
    },
    topCategories: buildSubscriptionPreferenceCounts(postEnabledSubscribers, "categories"),
    topTags: buildSubscriptionPreferenceCounts(postEnabledSubscribers, "tags"),
    recentSubscribers,
    recentNotifications: [...activeSubscribers]
      .filter((subscriber) => subscriber.lastNotifiedAt || subscriber.lastDigestNotifiedAt)
      .sort((left, right) => {
        const leftTime = Math.max(
          left.lastNotifiedAt?.getTime() ?? 0,
          left.lastDigestNotifiedAt?.getTime() ?? 0,
        );
        const rightTime = Math.max(
          right.lastNotifiedAt?.getTime() ?? 0,
          right.lastDigestNotifiedAt?.getTime() ?? 0,
        );

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return (
          right.notificationCount +
          right.digestNotificationCount -
          (left.notificationCount + left.digestNotificationCount)
        );
      })
      .slice(0, 12),
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

export async function getAdminPostCategoryOptions() {
  if (!isDatabaseConfigured()) {
    return [] as string[];
  }

  const posts = await prisma.post.findMany({
    select: {
      category: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { category: "asc" }],
  });

  const seen = new Set<string>();
  const categories: string[] = [];

  for (const post of posts) {
    const category = post.category.trim();
    const normalizedCategory = normalizeTaxonomyValue(category);

    if (!category || seen.has(normalizedCategory)) {
      continue;
    }

    seen.add(normalizedCategory);
    categories.push(category);
  }

  return categories;
}

export async function getAdminPostCategories() {
  if (!isDatabaseConfigured()) {
    return [] as AdminPostCategoryItem[];
  }

  const [posts, subscribers] = await Promise.all([
    prisma.post.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        category: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { publishedAt: "desc" }, { title: "asc" }],
    }),
    prisma.emailSubscriber.findMany({
      select: {
        categories: true,
      },
    }),
  ]);

  const categories = new Map<string, AdminPostCategoryItem>();

  for (const post of posts) {
    const category = post.category.trim();
    const normalizedCategory = normalizeTaxonomyValue(category);

    if (!category || !normalizedCategory) {
      continue;
    }

    const current = categories.get(normalizedCategory) ?? {
      category,
      normalizedCategory,
      totalPosts: 0,
      publishedPosts: 0,
      subscriberCount: 0,
      latestPublishedAt: null,
      latestUpdatedAt: null,
      recentPosts: [],
    };

    current.totalPosts += 1;
    current.latestUpdatedAt =
      !current.latestUpdatedAt || post.updatedAt > current.latestUpdatedAt
        ? post.updatedAt
        : current.latestUpdatedAt;
    current.latestPublishedAt =
      !current.latestPublishedAt || (post.publishedAt && post.publishedAt > current.latestPublishedAt)
        ? post.publishedAt
        : current.latestPublishedAt;

    if (post.status === PostStatus.PUBLISHED) {
      current.publishedPosts += 1;
    }

    if (current.recentPosts.length < 3) {
      current.recentPosts.push({
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        publishedAt: post.publishedAt,
      });
    }

    categories.set(normalizedCategory, current);
  }

  for (const subscriber of subscribers) {
    const seen = new Set<string>();

    for (const rawCategory of subscriber.categories) {
      const normalizedCategory = normalizeTaxonomyValue(rawCategory);

      if (!normalizedCategory || seen.has(normalizedCategory)) {
        continue;
      }

      seen.add(normalizedCategory);
      const current = categories.get(normalizedCategory);

      if (current) {
        current.subscriberCount += 1;
      }
    }
  }

  return [...categories.values()].sort((left, right) => {
    if (right.totalPosts !== left.totalPosts) {
      return right.totalPosts - left.totalPosts;
    }

    const rightTime = right.latestUpdatedAt?.getTime() ?? 0;
    const leftTime = left.latestUpdatedAt?.getTime() ?? 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.category.localeCompare(right.category, "zh-CN");
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

export async function getAdminPostLocalizationOptions(currentPostId?: string) {
  if (!isDatabaseConfigured()) {
    return demoPosts
      .filter(
        (post) =>
          (post.translationOfId ?? null) === null &&
          (!currentPostId || post.id !== currentPostId),
      )
      .map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        language: post.language ?? DEFAULT_CONTENT_LANGUAGE,
        status: post.status as PostStatus,
        publishedAt: post.publishedAt ?? null,
      }))
      .sort((left, right) => {
        const rightTime = new Date(right.publishedAt ?? 0).getTime();
        const leftTime = new Date(left.publishedAt ?? 0).getTime();

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return left.title.localeCompare(right.title, "zh-CN");
      });
  }

  return prisma.post.findMany({
    where: {
      translationOfId: null,
      ...(currentPostId ? { id: { not: currentPostId } } : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      language: true,
      status: true,
      publishedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
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
  const guestIdentitySupported = hasCommentGuestIdentitySupport();

  if (!repliesSupported) {
    const comments = await prisma.comment.findMany({
      include: { author: true, post: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return comments.map((comment) => ({
      ...comment,
      author: mapCommentAuthor(comment),
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
          authorId: true,
          ...(guestIdentitySupported
            ? {
                guestName: true,
                guestEmail: true,
              }
            : {}),
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  }).then((comments) =>
    comments.map((comment) => ({
      ...comment,
      author: mapCommentAuthor(comment),
      parent: comment.parent
        ? {
            ...comment.parent,
            author: mapCommentAuthor(comment.parent),
          }
        : null,
    })),
  );
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

export async function getPaperArchive(limit = 60, skip = 0) {
  if (!isDatabaseConfigured()) {
    return demoPaperEntries.slice(skip, skip + limit);
  }

  return prisma.dailyPaperEntry.findMany({
    include: { topic: true },
    orderBy: [{ digestDate: "desc" }, { topic: { name: "asc" } }, { publishedAt: "desc" }],
    skip,
    take: limit,
  });
}

export async function getPaperArchiveStats() {
  if (!isDatabaseConfigured()) {
    return {
      totalCount: demoPaperEntries.length,
      topicCount: new Set(demoPaperEntries.map((entry) => entry.topicId)).size,
      digestBatchCount: new Set(
        demoPaperEntries.map((entry) => new Date(entry.digestDate).toISOString()),
      ).size,
    };
  }

  const [totalCount, topicEntries, digestEntries] = await Promise.all([
    prisma.dailyPaperEntry.count(),
    prisma.dailyPaperEntry.findMany({
      distinct: ["topicId"],
      select: { topicId: true },
    }),
    prisma.dailyPaperEntry.findMany({
      distinct: ["digestDate"],
      select: { digestDate: true },
    }),
  ]);

  return {
    totalCount,
    topicCount: topicEntries.length,
    digestBatchCount: digestEntries.length,
  };
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

export async function getPublicResearchReadingList() {
  const owner = await getSiteOwnerIdentity();

  if (!isDatabaseConfigured()) {
    return buildDemoPublicResearchReadingData(owner);
  }

  const adminUser = await prisma.user.findFirst({
    where: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!adminUser) {
    return buildPublicResearchReadingData({
      owner,
      items: [],
      contentCandidates: [],
    });
  }

  const cutoff = getPublishingCutoff();
  const [libraryItems, posts, notes, digests] = await Promise.all([
    getUserPaperLibrary(adminUser.id),
    prisma.post.findMany({
      where: publicPostWhere(cutoff),
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
      where: publicNoteWhere(cutoff),
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        publishedAt: true,
      },
    }),
    prisma.weeklyDigest.findMany({
      where: publicWeeklyDigestWhere(cutoff),
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        highlights: true,
        publishedAt: true,
      },
    }),
  ]);

  const items: PaperFlowSourceItem[] = libraryItems.map((item) => ({
    id: item.id,
    arxivId: item.arxivId,
    title: item.title,
    summary: item.summary,
    authors: item.authors,
    paperUrl: item.paperUrl,
    pdfUrl: item.pdfUrl ?? null,
    primaryCategory: item.primaryCategory ?? null,
    topicName: item.topicName ?? null,
    status: item.status,
    progressPercent: item.progressPercent,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastReadAt: item.lastReadAt ?? null,
    completedAt: item.completedAt ?? null,
    annotationCount: item._count.annotations,
    annotations: item.annotations.map((annotation) => ({
      id: annotation.id,
      content: annotation.content,
      quote: annotation.quote,
      createdAt: annotation.createdAt,
    })),
  }));

  const contentCandidates: PaperFlowContentCandidate[] = [
    ...posts
      .filter((post) => Boolean(post.publishedAt))
      .map((post) => ({
        id: post.id,
        kindLabel: "Blog post",
        href: `/blog/${post.slug}`,
        title: post.title,
        summary: post.excerpt,
        content: post.content,
        publishedAt: post.publishedAt!,
      })),
    ...notes
      .filter((note) => Boolean(note.publishedAt))
      .map((note) => ({
        id: note.id,
        kindLabel: "Note",
        href: `/notes/${note.slug}`,
        title: note.title,
        summary: note.summary,
        content: note.content,
        publishedAt: note.publishedAt!,
      })),
    ...digests.map((digest) => ({
      id: digest.id,
      kindLabel: "Weekly digest",
      href: `/digest/${digest.slug}`,
      title: digest.title,
      summary: digest.summary,
      content: [digest.summary, digest.content, digest.highlights.join("\n")].join("\n"),
      publishedAt: digest.publishedAt,
    })),
  ];

  return buildPublicResearchReadingData({
    owner,
    items,
    contentCandidates,
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
    "/gallery",
    "/journal",
    "/notes",
    "/papers",
    "/papers/reading-list",
    "/digest",
    "/series",
    "/search",
    "/subscribe",
    "/tags",
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
      gallery: [],
      series: [],
      tags: tagEntries,
      categories: categoryEntries,
    };
  }

  const cutoff = getPublishingCutoff();
  const [posts, notes, journal, digests, gallery, series, tags, categories] = await Promise.all([
    prisma.post.findMany({ where: publicPostWhere(cutoff), select: { slug: true } }),
    prisma.note.findMany({ where: publicNoteWhere(cutoff), select: { slug: true } }),
    prisma.journalEntry.findMany({
      where: publicJournalWhere(cutoff),
      select: { slug: true },
    }),
    prisma.weeklyDigest.findMany({ where: publicWeeklyDigestWhere(cutoff), select: { slug: true } }),
    hasGalleryAlbumSupport()
      ? prisma.galleryAlbum.findMany({
          where: {
            status: PostStatus.PUBLISHED,
            publishedAt: {
              lte: cutoff,
            },
          },
          select: { slug: true },
        })
      : Promise.resolve([] as Array<{ slug: string }>),
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
    gallery: gallery.map((item) => item.slug),
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
