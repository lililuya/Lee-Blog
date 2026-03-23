import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import {
  demoJournalEntries,
  demoNotes,
  demoPaperEntries,
  demoPosts,
  demoWeeklyDigests,
} from "@/lib/demo-data";
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
import { getNoteBySlug, getPostBySlug, getWeeklyDigestBySlug } from "@/lib/queries";
import { recordRagQueryEvent } from "@/lib/rag-quality";
import { getContentStats, isDatabaseConfigured } from "@/lib/utils";
import { getChatMessageText, hasChatAttachments, type ChatMessage } from "@/lib/chat/message";
import { retrieveSemanticCandidates } from "@/lib/chat/semantic";
import type { RetrievedChatSource } from "@/lib/chat/types";

type RetrievalResult = {
  query: string;
  sources: RetrievedChatSource[];
  usedPageContext: boolean;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractQueryTerms(query: string) {
  const normalized = normalizeText(query);

  if (!normalized) {
    return [];
  }

  const rawTerms = normalized.split(/[\s,.;:!?/\\()[\]{}"'`|+-]+/).filter(Boolean);
  const filteredTerms = rawTerms.filter((term) => term.length > 1);
  return filteredTerms.length > 0 ? filteredTerms : [normalized];
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildSnippet(text: string, query: string, maxLength = 220) {
  const plainText = getContentStats(text).plainText;

  if (!plainText) {
    return "";
  }

  const normalizedText = normalizeText(plainText);
  const normalizedQuery = normalizeText(query);
  const queryTerms = extractQueryTerms(query);
  const matchTerm =
    (normalizedQuery && normalizedText.includes(normalizedQuery) && normalizedQuery) ||
    queryTerms.find((term) => normalizedText.includes(term)) ||
    "";

  if (!matchTerm) {
    return truncate(plainText, maxLength);
  }

  const matchIndex = normalizedText.indexOf(matchTerm);
  const snippetStart = Math.max(0, matchIndex - Math.floor(maxLength * 0.35));
  const snippetEnd = Math.min(plainText.length, snippetStart + maxLength);
  const prefix = snippetStart > 0 ? "..." : "";
  const suffix = snippetEnd < plainText.length ? "..." : "";

  return `${prefix}${plainText.slice(snippetStart, snippetEnd).trim()}${suffix}`;
}

function scoreField(query: string, text: string | null | undefined, weight: number) {
  if (!text) {
    return 0;
  }

  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  const terms = extractQueryTerms(query);
  let score = 0;

  if (normalizedQuery && normalizedText.includes(normalizedQuery)) {
    score += weight * 4;
  }

  for (const term of terms) {
    if (normalizedText.includes(term)) {
      score += weight;
    }
  }

  return score;
}

function buildSource(input: {
  id: string;
  title: string;
  href: string;
  kindLabel: string;
  visibility: "public" | "private";
  query: string;
  score: number;
  isCurrentPage?: boolean;
  snippetSource: string;
  contentSource: string;
}) {
  return {
    id: input.id,
    title: input.title,
    href: input.href,
    kindLabel: input.kindLabel,
    visibility: input.visibility,
    isCurrentPage: Boolean(input.isCurrentPage),
    score: input.score,
    snippet: buildSnippet(input.snippetSource, input.query),
    content: truncate(getContentStats(input.contentSource).plainText, 1400),
  } satisfies RetrievedChatSource;
}

function dedupeSources(sources: RetrievedChatSource[]) {
  const sourceMap = new Map<string, RetrievedChatSource>();

  for (const source of sources) {
    const key = `${source.href}::${source.title}`;
    const existing = sourceMap.get(key);

    if (!existing) {
      sourceMap.set(key, source);
      continue;
    }

    const merged: RetrievedChatSource = {
      ...existing,
      score: existing.score + source.score,
      isCurrentPage: existing.isCurrentPage || source.isCurrentPage,
      visibility:
        existing.visibility === "private" || source.visibility === "private"
          ? "private"
          : "public",
    };

    if (source.score > existing.score) {
      merged.snippet = source.snippet;
      merged.content = source.content;
      merged.kindLabel = source.kindLabel;
      merged.href = source.href;
      merged.id = source.id;
    }

    sourceMap.set(key, merged);
  }

  return [...sourceMap.values()].sort((left, right) => right.score - left.score);
}

function containsText(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

async function resolveCurrentPageSource(
  pathname?: string | null,
): Promise<RetrievedChatSource | null> {
  if (!pathname?.startsWith("/")) {
    return null;
  }

  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);

  if (blogMatch) {
    const post = await getPostBySlug(blogMatch[1]);

    if (!post) {
      return null;
    }

    return buildSource({
      id: `page-post-${post.id}`,
      title: post.title,
      href: `/blog/${post.slug}`,
      kindLabel: "Current blog post",
      visibility: "public",
      query: post.title,
      score: 10_000,
      isCurrentPage: true,
      snippetSource: `${post.excerpt}\n${post.content}`,
      contentSource: `${post.title}\n${post.excerpt}\n${post.content}`,
    });
  }

  const noteMatch = pathname.match(/^\/notes\/([^/]+)$/);

  if (noteMatch) {
    const note = await getNoteBySlug(noteMatch[1]);

    if (!note) {
      return null;
    }

    return buildSource({
      id: `page-note-${note.id}`,
      title: note.title,
      href: `/notes/${note.slug}`,
      kindLabel: "Current note",
      visibility: "public",
      query: note.title,
      score: 10_000,
      isCurrentPage: true,
      snippetSource: `${note.summary}\n${note.content}`,
      contentSource: `${note.title}\n${note.summary}\n${note.content}`,
    });
  }

  const digestMatch = pathname.match(/^\/digest\/([^/]+)$/);

  if (digestMatch) {
    const digest = await getWeeklyDigestBySlug(digestMatch[1]);

    if (!digest) {
      return null;
    }

    return buildSource({
      id: `page-digest-${digest.id}`,
      title: digest.title,
      href: `/digest/${digest.slug}`,
      kindLabel: "Current weekly digest",
      visibility: "public",
      query: digest.title,
      score: 10_000,
      isCurrentPage: true,
      snippetSource: `${digest.summary}\n${digest.content}`,
      contentSource: `${digest.title}\n${digest.summary}\n${digest.content}`,
    });
  }

  return null;
}

function retrievePublicCandidatesFromDemo(query: string) {
  const sources: RetrievedChatSource[] = [];

  for (const post of demoPosts) {
    if (!isPublicPostLike(post)) {
      continue;
    }

    const score =
      scoreField(query, post.title, 8) +
      scoreField(query, post.excerpt, 5) +
      scoreField(query, post.content, 3) +
      scoreField(query, post.category, 2) +
      scoreField(query, post.tags.join(" "), 2);

    if (score > 0) {
      sources.push(
        buildSource({
          id: `post-${post.id}`,
          title: post.title,
          href: `/blog/${post.slug}`,
          kindLabel: "Blog post",
          visibility: "public",
          query,
          score,
          snippetSource: `${post.excerpt}\n${post.content}`,
          contentSource: `${post.title}\n${post.excerpt}\n${post.content}`,
        }),
      );
    }
  }

  for (const note of demoNotes) {
    if (!isPublicPostLike(note)) {
      continue;
    }

    const score =
      scoreField(query, note.title, 8) +
      scoreField(query, note.summary, 5) +
      scoreField(query, note.content, 3) +
      scoreField(query, note.noteType, 2) +
      scoreField(query, note.tags.join(" "), 2);

    if (score > 0) {
      sources.push(
        buildSource({
          id: `note-${note.id}`,
          title: note.title,
          href: `/notes/${note.slug}`,
          kindLabel: "Evergreen note",
          visibility: "public",
          query,
          score,
          snippetSource: `${note.summary}\n${note.content}`,
          contentSource: `${note.title}\n${note.summary}\n${note.content}`,
        }),
      );
    }
  }

  for (const entry of demoJournalEntries) {
    if (!isPublicJournalLike(entry)) {
      continue;
    }

    const score =
      scoreField(query, entry.title, 7) +
      scoreField(query, entry.summary, 4) +
      scoreField(query, entry.content, 3) +
      scoreField(query, entry.mood, 1);

    if (score > 0) {
      sources.push(
        buildSource({
          id: `journal-${entry.id}`,
          title: entry.title,
          href: `/journal/${entry.slug}`,
          kindLabel: "Journal entry",
          visibility: "public",
          query,
          score,
          snippetSource: `${entry.summary}\n${entry.content}`,
          contentSource: `${entry.title}\n${entry.summary}\n${entry.content}`,
        }),
      );
    }
  }

  for (const entry of demoPaperEntries) {
    const score =
      scoreField(query, entry.title, 7) +
      scoreField(query, entry.summary, 4) +
      scoreField(query, entry.primaryCategory, 2) +
      scoreField(query, entry.topic.name, 3) +
      scoreField(query, entry.authors.join(" "), 2);

    if (score > 0) {
      sources.push(
        buildSource({
          id: `paper-${entry.id}`,
          title: entry.title,
          href: "/papers",
          kindLabel: "Daily paper",
          visibility: "public",
          query,
          score,
          snippetSource: `${entry.summary}\n${entry.primaryCategory ?? ""}`,
          contentSource: `${entry.title}\n${entry.summary}\n${entry.topic.name}\n${entry.authors.join(", ")}`,
        }),
      );
    }
  }

  for (const digest of demoWeeklyDigests) {
    if (!isLivePublishedAt(digest.publishedAt)) {
      continue;
    }

    const score =
      scoreField(query, digest.title, 8) +
      scoreField(query, digest.summary, 5) +
      scoreField(query, digest.content, 3) +
      scoreField(query, digest.highlights.join(" "), 2) +
      scoreField(query, digest.featuredTopics.join(" "), 2);

    if (score > 0) {
      sources.push(
        buildSource({
          id: `digest-${digest.id}`,
          title: digest.title,
          href: `/digest/${digest.slug}`,
          kindLabel: "Weekly digest",
          visibility: "public",
          query,
          score,
          snippetSource: `${digest.summary}\n${digest.content}`,
          contentSource: `${digest.title}\n${digest.summary}\n${digest.content}`,
        }),
      );
    }
  }

  return sources;
}

async function retrievePublicCandidates(query: string) {
  if (!isDatabaseConfigured()) {
    return retrievePublicCandidatesFromDemo(query);
  }

  const cutoff = getPublishingCutoff();
  const [posts, notes, journalEntries, paperEntries, weeklyDigests] = await Promise.all([
    prisma.post.findMany({
      where: {
        ...publicPostWhere(cutoff),
        OR: [
          { title: containsText(query) },
          { excerpt: containsText(query) },
          { content: containsText(query) },
          { category: containsText(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        category: true,
        tags: true,
      },
      take: 6,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.note.findMany({
      where: {
        ...publicNoteWhere(cutoff),
        OR: [
          { title: containsText(query) },
          { summary: containsText(query) },
          { content: containsText(query) },
          { noteType: containsText(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        noteType: true,
        tags: true,
      },
      take: 6,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.journalEntry.findMany({
      where: {
        ...publicJournalWhere(cutoff),
        OR: [
          { title: containsText(query) },
          { summary: containsText(query) },
          { content: containsText(query) },
          { mood: containsText(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        mood: true,
      },
      take: 6,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.dailyPaperEntry.findMany({
      where: {
        OR: [
          { title: containsText(query) },
          { summary: containsText(query) },
          { primaryCategory: containsText(query) },
          { topic: { is: { name: containsText(query) } } },
        ],
      },
      select: {
        id: true,
        title: true,
        summary: true,
        primaryCategory: true,
        authors: true,
        topic: {
          select: {
            name: true,
          },
        },
      },
      take: 6,
      orderBy: [{ digestDate: "desc" }, { publishedAt: "desc" }],
    }),
    prisma.weeklyDigest.findMany({
      where: {
        ...publicWeeklyDigestWhere(cutoff),
        OR: [
          { title: containsText(query) },
          { summary: containsText(query) },
          { content: containsText(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        highlights: true,
        featuredTopics: true,
      },
      take: 6,
      orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
    }),
  ]);

  return [
    ...posts.map((post) =>
      buildSource({
        id: `post-${post.id}`,
        title: post.title,
        href: `/blog/${post.slug}`,
        kindLabel: "Blog post",
        visibility: "public",
        query,
        score:
          scoreField(query, post.title, 8) +
          scoreField(query, post.excerpt, 5) +
          scoreField(query, post.content, 3) +
          scoreField(query, post.category, 2) +
          scoreField(query, post.tags.join(" "), 2),
        snippetSource: `${post.excerpt}\n${post.content}`,
        contentSource: `${post.title}\n${post.excerpt}\n${post.content}`,
      }),
    ),
    ...notes.map((note) =>
      buildSource({
        id: `note-${note.id}`,
        title: note.title,
        href: `/notes/${note.slug}`,
        kindLabel: "Evergreen note",
        visibility: "public",
        query,
        score:
          scoreField(query, note.title, 8) +
          scoreField(query, note.summary, 5) +
          scoreField(query, note.content, 3) +
          scoreField(query, note.noteType, 2) +
          scoreField(query, note.tags.join(" "), 2),
        snippetSource: `${note.summary}\n${note.content}`,
        contentSource: `${note.title}\n${note.summary}\n${note.content}`,
      }),
    ),
    ...journalEntries.map((entry) =>
      buildSource({
        id: `journal-${entry.id}`,
        title: entry.title,
        href: `/journal/${entry.slug}`,
        kindLabel: "Journal entry",
        visibility: "public",
        query,
        score:
          scoreField(query, entry.title, 7) +
          scoreField(query, entry.summary, 4) +
          scoreField(query, entry.content, 3) +
          scoreField(query, entry.mood, 1),
        snippetSource: `${entry.summary}\n${entry.content}`,
        contentSource: `${entry.title}\n${entry.summary}\n${entry.content}`,
      }),
    ),
    ...paperEntries.map((entry) =>
      buildSource({
        id: `paper-${entry.id}`,
        title: entry.title,
        href: "/papers",
        kindLabel: "Daily paper",
        visibility: "public",
        query,
        score:
          scoreField(query, entry.title, 7) +
          scoreField(query, entry.summary, 4) +
          scoreField(query, entry.primaryCategory, 2) +
          scoreField(query, entry.topic.name, 3) +
          scoreField(query, entry.authors.join(" "), 2),
        snippetSource: `${entry.summary}\n${entry.primaryCategory ?? ""}`,
        contentSource: `${entry.title}\n${entry.summary}\n${entry.topic.name}\n${entry.authors.join(", ")}`,
      }),
    ),
    ...weeklyDigests.map((digest) =>
      buildSource({
        id: `digest-${digest.id}`,
        title: digest.title,
        href: `/digest/${digest.slug}`,
        kindLabel: "Weekly digest",
        visibility: "public",
        query,
        score:
          scoreField(query, digest.title, 8) +
          scoreField(query, digest.summary, 5) +
          scoreField(query, digest.content, 3) +
          scoreField(query, digest.highlights.join(" "), 2) +
          scoreField(query, digest.featuredTopics.join(" "), 2),
        snippetSource: `${digest.summary}\n${digest.content}`,
        contentSource: `${digest.title}\n${digest.summary}\n${digest.content}`,
      }),
    ),
  ].filter((source) => source.score > 0);
}

async function retrievePrivateCandidates(
  query: string,
  currentUser: NonNullable<CurrentUser>,
) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const [libraryItems, annotations] = await Promise.all([
    prisma.paperLibraryItem.findMany({
      where: {
        userId: currentUser.id,
        OR: [
          { title: containsText(query) },
          { summary: containsText(query) },
          { topicName: containsText(query) },
          { primaryCategory: containsText(query) },
        ],
      },
      select: {
        id: true,
        title: true,
        summary: true,
        authors: true,
        topicName: true,
        primaryCategory: true,
      },
      take: 4,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.paperAnnotation.findMany({
      where: {
        userId: currentUser.id,
        OR: [
          { content: containsText(query) },
          { quote: containsText(query) },
          { libraryItem: { is: { title: containsText(query) } } },
        ],
      },
      select: {
        id: true,
        content: true,
        quote: true,
        libraryItem: {
          select: {
            title: true,
          },
        },
      },
      take: 4,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return [
    ...libraryItems.map((item) =>
      buildSource({
        id: `library-${item.id}`,
        title: item.title,
        href: "/papers/library",
        kindLabel: "My paper library",
        visibility: "private",
        query,
        score:
          scoreField(query, item.title, 8) +
          scoreField(query, item.summary, 4) +
          scoreField(query, item.topicName, 2) +
          scoreField(query, item.primaryCategory, 2) +
          scoreField(query, item.authors.join(" "), 2),
        snippetSource: `${item.summary}\n${item.topicName ?? ""}`,
        contentSource: `${item.title}\n${item.summary}\n${item.topicName ?? ""}\n${item.authors.join(", ")}`,
      }),
    ),
    ...annotations.map((annotation) =>
      buildSource({
        id: `annotation-${annotation.id}`,
        title: annotation.libraryItem.title,
        href: "/papers/library",
        kindLabel: "My annotation",
        visibility: "private",
        query,
        score:
          scoreField(query, annotation.libraryItem.title, 6) +
          scoreField(query, annotation.quote, 4) +
          scoreField(query, annotation.content, 5),
        snippetSource: `${annotation.quote ?? ""}\n${annotation.content}`,
        contentSource: `${annotation.libraryItem.title}\n${annotation.quote ?? ""}\n${annotation.content}`,
      }),
    ),
  ].filter((source) => source.score > 0);
}

export function buildRetrievalQuery(messages: ChatMessage[]) {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => {
      const text = getChatMessageText(message);

      if (text) {
        return text;
      }

      return hasChatAttachments(message) ? "uploaded image" : "";
    })
    .filter(Boolean);

  return recentUserMessages.join("\n").trim();
}

export async function retrieveChatContext(input: {
  query: string;
  pathname?: string | null;
  currentUser: NonNullable<CurrentUser>;
}): Promise<RetrievalResult> {
  const query = input.query.trim();

  if (!query) {
    return {
      query,
      sources: [],
      usedPageContext: false,
    };
  }

  const [currentPageSource, semanticSources, publicSources, privateSources] = await Promise.all([
    resolveCurrentPageSource(input.pathname),
    retrieveSemanticCandidates(query, input.currentUser),
    retrievePublicCandidates(query),
    retrievePrivateCandidates(query, input.currentUser),
  ]);

  const sources = dedupeSources(
    [currentPageSource, ...semanticSources, ...publicSources, ...privateSources].filter(
      (value): value is RetrievedChatSource => Boolean(value),
    ),
  ).slice(0, 6);

  await recordRagQueryEvent({
    query,
    mode: "CHAT",
    pathname: input.pathname,
    usedPageContext: Boolean(currentPageSource),
    sources: sources.map((source) => ({
      title: source.title,
      href: source.href,
      kindLabel: source.kindLabel,
      visibility: source.visibility,
      score: source.score,
    })),
  });

  return {
    query,
    sources,
    usedPageContext: Boolean(currentPageSource),
  };
}
