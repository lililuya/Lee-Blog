import "server-only";
import { PaperReadingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

export async function getPaperLibraryItemsForArxivIds(userId: string, arxivIds: string[]) {
  if (!isDatabaseConfigured() || arxivIds.length === 0) {
    return [];
  }

  return prisma.paperLibraryItem.findMany({
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
}

export async function getUserPaperLibrary(userId: string) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.paperLibraryItem.findMany({
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
      { updatedAt: "desc" },
    ],
  });
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