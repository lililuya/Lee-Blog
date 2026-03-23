import "server-only";
import { PaperReadingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

async function hydratePaperPublishedAt<T extends { arxivId: string; publishedAt: Date | null }>(
  items: T[],
) {
  const missingArxivIds = Array.from(
    new Set(items.filter((item) => !item.publishedAt).map((item) => item.arxivId)),
  );

  if (missingArxivIds.length === 0) {
    return items;
  }

  const entries = await prisma.dailyPaperEntry.findMany({
    where: {
      arxivId: { in: missingArxivIds },
    },
    select: {
      arxivId: true,
      publishedAt: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  const publishedAtMap = new Map<string, Date>();

  for (const entry of entries) {
    if (!publishedAtMap.has(entry.arxivId)) {
      publishedAtMap.set(entry.arxivId, entry.publishedAt);
    }
  }

  return items.map((item) => ({
    ...item,
    publishedAt: item.publishedAt ?? publishedAtMap.get(item.arxivId) ?? null,
  }));
}

export async function getPaperLibraryItemsForArxivIds(userId: string, arxivIds: string[]) {
  if (!isDatabaseConfigured() || arxivIds.length === 0) {
    return [];
  }

  const items = await prisma.paperLibraryItem.findMany({
    where: {
      userId,
      arxivId: { in: arxivIds },
    },
    include: {
      _count: {
        select: {
          annotations: true,
        },
      },
    },
  });

  return hydratePaperPublishedAt(items);
}

export async function getUserPaperLibrary(userId: string) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const items = await prisma.paperLibraryItem.findMany({
    where: { userId },
    include: {
      annotations: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          annotations: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { lastReadAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return hydratePaperPublishedAt(items);
}

export async function getAdminPaperLibraryOverview() {
  if (!isDatabaseConfigured()) {
    return {
      savedItems: 0,
      readingItems: 0,
      completedItems: 0,
      archivedItems: 0,
      annotations: 0,
    };
  }

  const [savedItems, readingItems, completedItems, archivedItems, annotations] = await Promise.all([
    prisma.paperLibraryItem.count(),
    prisma.paperLibraryItem.count({ where: { status: PaperReadingStatus.READING } }),
    prisma.paperLibraryItem.count({ where: { status: PaperReadingStatus.COMPLETED } }),
    prisma.paperLibraryItem.count({ where: { status: PaperReadingStatus.ARCHIVED } }),
    prisma.paperAnnotation.count(),
  ]);

  return {
    savedItems,
    readingItems,
    completedItems,
    archivedItems,
    annotations,
  };
}

export async function getPaperHighlightInsertionsForUser(userId: string, limit = 18) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const annotations = await prisma.paperAnnotation.findMany({
    where: {
      userId,
      quote: {
        not: null,
      },
    },
    select: {
      id: true,
      quote: true,
      content: true,
      createdAt: true,
      libraryItem: {
        select: {
          title: true,
          authors: true,
          paperUrl: true,
          arxivId: true,
          primaryCategory: true,
          publishedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return annotations
    .map((annotation) => ({
      id: annotation.id,
      title: annotation.libraryItem.title,
      authors: annotation.libraryItem.authors,
      paperUrl: annotation.libraryItem.paperUrl,
      arxivId: annotation.libraryItem.arxivId,
      primaryCategory: annotation.libraryItem.primaryCategory,
      publishedAt: annotation.libraryItem.publishedAt?.toISOString() ?? null,
      quote: annotation.quote?.trim() ?? "",
      note: annotation.content.trim() || null,
    }))
    .filter((annotation) => annotation.quote.length > 0);
}
