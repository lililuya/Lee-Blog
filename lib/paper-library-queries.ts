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
