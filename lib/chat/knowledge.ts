import type { PrismaClient } from "@prisma/client";
import { RagChunkVisibility, RagSourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getContentStats, isDatabaseConfigured } from "@/lib/utils";

type KnowledgeSource = {
  sourceKey: string;
  sourceType: RagSourceType;
  sourceId: string;
  ownerUserId?: string;
  visibility: RagChunkVisibility;
  title: string;
  href: string;
  kindLabel: string;
  updatedAt: Date;
  content: string;
};

type RagChunkRecord = {
  sourceKey: string;
  sourceType: RagSourceType;
  sourceId: string;
  ownerUserId?: string;
  visibility: RagChunkVisibility;
  title: string;
  href: string;
  kindLabel: string;
  chunkIndex: number;
  snippet: string;
  content: string;
};

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildSnippet(text: string) {
  return truncate(getContentStats(text).plainText, 220);
}

export function chunkKnowledgeContent(text: string) {
  const plainText = getContentStats(text).plainText;

  if (!plainText) {
    return [];
  }

  const normalized = plainText.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  const maxLength = 900;
  const overlap = 140;

  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(normalized.length, start + maxLength);

    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(" ", end);

      if (boundary > start + 240) {
        end = boundary;
      }
    }

    const chunk = normalized.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

function buildChunkRecords(source: KnowledgeSource): RagChunkRecord[] {
  const chunks = chunkKnowledgeContent(source.content);

  return chunks.map((content, chunkIndex) => ({
    sourceKey: source.sourceKey,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    ownerUserId: source.ownerUserId,
    visibility: source.visibility,
    title: source.title,
    href: source.href,
    kindLabel: source.kindLabel,
    chunkIndex,
    snippet: buildSnippet(content),
    content,
  }));
}

export async function collectKnowledgeSources(client: PrismaClient = prisma) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is required to sync RAG knowledge.");
  }

  const [posts, notes, journalEntries, dailyPapers, digests, libraryItems, annotations] =
    await Promise.all([
      client.post.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          content: true,
          category: true,
          tags: true,
          updatedAt: true,
        },
      }),
      client.note.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          content: true,
          noteType: true,
          tags: true,
          updatedAt: true,
        },
      }),
      client.journalEntry.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          content: true,
          mood: true,
          updatedAt: true,
        },
      }),
      client.dailyPaperEntry.findMany({
        select: {
          id: true,
          title: true,
          summary: true,
          primaryCategory: true,
          authors: true,
          updatedAt: true,
          topic: {
            select: {
              name: true,
            },
          },
        },
      }),
      client.weeklyDigest.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          content: true,
          highlights: true,
          featuredTopics: true,
          updatedAt: true,
        },
      }),
      client.paperLibraryItem.findMany({
        select: {
          id: true,
          userId: true,
          title: true,
          summary: true,
          topicName: true,
          primaryCategory: true,
          authors: true,
          updatedAt: true,
        },
      }),
      client.paperAnnotation.findMany({
        select: {
          id: true,
          userId: true,
          content: true,
          quote: true,
          updatedAt: true,
          libraryItem: {
            select: {
              title: true,
            },
          },
        },
      }),
    ]);

  const sources: KnowledgeSource[] = [
    ...posts.map((post) => ({
      sourceKey: `post:${post.id}`,
      sourceType: RagSourceType.POST,
      sourceId: post.id,
      visibility: RagChunkVisibility.PUBLIC,
      title: post.title,
      href: `/blog/${post.slug}`,
      kindLabel: "Blog post",
      updatedAt: post.updatedAt,
      content: `${post.title}\n\n${post.excerpt}\n\n${post.content}\n\n${post.category}\n\n${post.tags.join(", ")}`,
    })),
    ...notes.map((note) => ({
      sourceKey: `note:${note.id}`,
      sourceType: RagSourceType.NOTE,
      sourceId: note.id,
      visibility: RagChunkVisibility.PUBLIC,
      title: note.title,
      href: `/notes/${note.slug}`,
      kindLabel: "Evergreen note",
      updatedAt: note.updatedAt,
      content: `${note.title}\n\n${note.summary}\n\n${note.content}\n\n${note.noteType ?? ""}\n\n${note.tags.join(", ")}`,
    })),
    ...journalEntries.map((entry) => ({
      sourceKey: `journal:${entry.id}`,
      sourceType: RagSourceType.JOURNAL,
      sourceId: entry.id,
      visibility: RagChunkVisibility.PUBLIC,
      title: entry.title,
      href: `/journal/${entry.slug}`,
      kindLabel: "Journal entry",
      updatedAt: entry.updatedAt,
      content: `${entry.title}\n\n${entry.summary}\n\n${entry.content}\n\n${entry.mood ?? ""}`,
    })),
    ...dailyPapers.map((entry) => ({
      sourceKey: `daily-paper:${entry.id}`,
      sourceType: RagSourceType.DAILY_PAPER,
      sourceId: entry.id,
      visibility: RagChunkVisibility.PUBLIC,
      title: entry.title,
      href: "/papers",
      kindLabel: "Daily paper",
      updatedAt: entry.updatedAt,
      content: `${entry.title}\n\n${entry.summary}\n\n${entry.topic.name}\n\n${entry.primaryCategory ?? ""}\n\n${entry.authors.join(", ")}`,
    })),
    ...digests.map((digest) => ({
      sourceKey: `digest:${digest.id}`,
      sourceType: RagSourceType.DIGEST,
      sourceId: digest.id,
      visibility: RagChunkVisibility.PUBLIC,
      title: digest.title,
      href: `/digest/${digest.slug}`,
      kindLabel: "Weekly digest",
      updatedAt: digest.updatedAt,
      content: `${digest.title}\n\n${digest.summary}\n\n${digest.content}\n\n${digest.highlights.join("\n")}\n\n${digest.featuredTopics.join(", ")}`,
    })),
    ...libraryItems.map((item) => ({
      sourceKey: `paper-library:${item.id}`,
      sourceType: RagSourceType.PAPER_LIBRARY_ITEM,
      sourceId: item.id,
      ownerUserId: item.userId,
      visibility: RagChunkVisibility.PRIVATE,
      title: item.title,
      href: "/papers/library",
      kindLabel: "My paper library",
      updatedAt: item.updatedAt,
      content: `${item.title}\n\n${item.summary}\n\n${item.topicName ?? ""}\n\n${item.primaryCategory ?? ""}\n\n${item.authors.join(", ")}`,
    })),
    ...annotations.map((annotation) => ({
      sourceKey: `paper-annotation:${annotation.id}`,
      sourceType: RagSourceType.PAPER_ANNOTATION,
      sourceId: annotation.id,
      ownerUserId: annotation.userId,
      visibility: RagChunkVisibility.PRIVATE,
      title: annotation.libraryItem.title,
      href: "/papers/library",
      kindLabel: "My annotation",
      updatedAt: annotation.updatedAt,
      content: `${annotation.libraryItem.title}\n\n${annotation.quote ?? ""}\n\n${annotation.content}`,
    })),
  ];

  return sources.filter((source) => getContentStats(source.content).plainText.length > 0);
}

export async function buildKnowledgeChunks(client: PrismaClient = prisma) {
  const sources = await collectKnowledgeSources(client);
  return sources.flatMap((source) => buildChunkRecords(source));
}
