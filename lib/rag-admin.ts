import "server-only";

import { RagChunkVisibility } from "@prisma/client";
import { cosineSimilarity, embedTexts, getRagEmbeddingConfig, getRagEmbeddingReservations } from "@/lib/chat/embeddings";
import { buildKnowledgeChunks, collectKnowledgeSources } from "@/lib/chat/knowledge";
import { prisma } from "@/lib/prisma";
import { recordRagQueryEvent } from "@/lib/rag-quality";
import { isDatabaseConfigured } from "@/lib/utils";

type RagSourceSummary = {
  sourceKey: string;
  sourceType: string;
  title: string;
  href: string;
  kindLabel: string;
  visibility: "PUBLIC" | "PRIVATE";
  ownerUserId: string | null;
  chunkCount: number;
  updatedAt: Date;
};

type RagPreviewResult = {
  sourceKey: string;
  title: string;
  href: string;
  kindLabel: string;
  visibility: "public" | "private";
  score: number;
  hitCount: number;
  snippet: string;
};

type RagTopQuerySummary = {
  normalizedQuery: string;
  displayQuery: string;
  count: number;
  emptyCount: number;
  averageSourceCount: number;
  lastSeenAt: Date;
  modes: string[];
};

type RagQueryActivityItem = {
  id: string;
  query: string;
  mode: string;
  pathname: string | null;
  sourceCount: number;
  publicSourceCount: number;
  privateSourceCount: number;
  usedPageContext: boolean;
  topScore: number | null;
  topSourceTitle: string | null;
  topSourceKindLabel: string | null;
  topSourceHref: string | null;
  topSourceTitles: string[];
  createdAt: Date;
};

type RagSyncHealthItem = {
  sourceKey: string;
  sourceType: string;
  title: string;
  href: string;
  kindLabel: string;
  visibility: "PUBLIC" | "PRIVATE";
  sourceUpdatedAt: Date;
  chunkUpdatedAt: Date | null;
  chunkCount: number;
  status: "MISSING" | "STALE";
};

type RagSyncBreakdownItem = {
  sourceType: string;
  currentSources: number;
  indexedSources: number;
  syncedSources: number;
  missingSources: number;
  staleSources: number;
};

const DAY_MS = 1000 * 60 * 60 * 24;
const RAG_QUALITY_WINDOW_DAYS = 30;

function sortByUpdatedAtDesc(left: { updatedAt: Date }, right: { updatedAt: Date }) {
  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

function toVisibilityLabel(value: RagChunkVisibility) {
  return value === RagChunkVisibility.PRIVATE ? "PRIVATE" : "PUBLIC";
}

async function previewRagQuery(query: string): Promise<RagPreviewResult[]> {
  const normalizedQuery = query.trim();
  const config = await getRagEmbeddingConfig("text");

  if (!normalizedQuery || !config || !isDatabaseConfigured()) {
    return [];
  }

  const chunks = await prisma.ragKnowledgeChunk.findMany({
    where: { visibility: RagChunkVisibility.PUBLIC },
    select: {
      sourceKey: true,
      title: true,
      href: true,
      kindLabel: true,
      visibility: true,
      snippet: true,
      embedding: true,
    },
  });

  if (chunks.length === 0) {
    return [];
  }

  let queryEmbedding: number[];

  try {
    [queryEmbedding] = await embedTexts([normalizedQuery], { batchSize: 1 });
  } catch (error) {
    console.error("[rag preview]", error);
    return [];
  }

  const grouped = new Map<
    string,
    {
      sourceKey: string;
      title: string;
      href: string;
      kindLabel: string;
      visibility: "public" | "private";
      score: number;
      hitCount: number;
      snippet: string;
    }
  >();

  for (const chunk of chunks) {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

    if (similarity < 0.22) {
      continue;
    }

    const existing = grouped.get(chunk.sourceKey);
    const score = Math.round(similarity * 100);

    if (!existing) {
      grouped.set(chunk.sourceKey, {
        sourceKey: chunk.sourceKey,
        title: chunk.title,
        href: chunk.href,
        kindLabel: chunk.kindLabel,
        visibility: chunk.visibility === RagChunkVisibility.PRIVATE ? "private" : "public",
        score,
        hitCount: 1,
        snippet: chunk.snippet,
      });
      continue;
    }

    existing.hitCount += 1;

    if (score > existing.score) {
      existing.score = score;
      existing.snippet = chunk.snippet;
    }
  }

  const results = Array.from(grouped.values())
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.hitCount - left.hitCount;
    })
    .slice(0, 8);

  await recordRagQueryEvent({
    query: normalizedQuery,
    mode: "PREVIEW",
    sources: results.map((result) => ({
      title: result.title,
      href: result.href,
      kindLabel: result.kindLabel,
      visibility: result.visibility,
      score: result.score,
    })),
  });

  return results;
}

export async function syncRagKnowledge() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const embeddingConfig = await getRagEmbeddingConfig("text");

  if (!embeddingConfig) {
    throw new Error("RAG text embedding is not configured.");
  }

  const chunkRecords = await buildKnowledgeChunks(prisma);
  const embeddings = await embedTexts(
    chunkRecords.map((chunk) => chunk.content),
    { batchSize: 16 },
  );

  await prisma.ragKnowledgeChunk.deleteMany({});

  const batchSize = 100;

  for (let index = 0; index < chunkRecords.length; index += batchSize) {
    const batch = chunkRecords.slice(index, index + batchSize);

    await prisma.ragKnowledgeChunk.createMany({
      data: batch.map((chunk, batchIndex) => ({
        ...chunk,
        embedding: embeddings[index + batchIndex],
      })),
    });
  }

  return {
    embeddingModel: embeddingConfig.model,
    sourceCount: new Set(chunkRecords.map((chunk) => chunk.sourceKey)).size,
    chunkCount: chunkRecords.length,
  };
}

export async function getAdminRagOverview(query?: string) {
  const reservations = getRagEmbeddingReservations();
  const embeddingConfig = await getRagEmbeddingConfig("text");
  const qualityWindowStart = new Date(Date.now() - RAG_QUALITY_WINDOW_DAYS * DAY_MS);

  if (!isDatabaseConfigured()) {
    return {
      configured: Boolean(embeddingConfig),
      embeddingModel: embeddingConfig?.model ?? null,
      embeddingSource: embeddingConfig?.source ?? null,
      reservations,
      totals: {
        chunks: 0,
        sources: 0,
        publicChunks: 0,
        privateChunks: 0,
      },
      qualityWindowDays: RAG_QUALITY_WINDOW_DAYS,
      quality: {
        totalQueries: 0,
        chatQueries: 0,
        previewQueries: 0,
        emptyQueries: 0,
        emptyRecallRate: 0,
        averageSourceCount: 0,
        averagePublicSourceCount: 0,
        averagePrivateSourceCount: 0,
        usedPageContextQueries: 0,
      },
      syncHealth: {
        totalEligibleSources: 0,
        indexedSources: 0,
        syncedSources: 0,
        missingSources: 0,
        staleSources: 0,
        orphanedSources: 0,
        sourceTypeBreakdown: [] as RagSyncBreakdownItem[],
        recentAttentionSources: [] as RagSyncHealthItem[],
      },
      latestUpdatedAt: null as Date | null,
      sourceTypeBreakdown: [] as Array<{ sourceType: string; chunks: number; sources: number }>,
      topQueries: [] as RagTopQuerySummary[],
      recentEmptyQueries: [] as RagQueryActivityItem[],
      recentSuccessfulQueries: [] as RagQueryActivityItem[],
      recentSources: [] as RagSourceSummary[],
      recentChunks: [] as Array<{
        id: string;
        title: string;
        kindLabel: string;
        href: string;
        visibility: "PUBLIC" | "PRIVATE";
        updatedAt: Date;
        snippet: string;
      }>,
      previewQuery: query?.trim() ?? "",
      previewResults: [] as RagPreviewResult[],
    };
  }

  const [allChunkMeta, recentChunks, previewResults, ragQueryLogs, currentSources] = await Promise.all([
    prisma.ragKnowledgeChunk.findMany({
      select: {
        sourceKey: true,
        sourceType: true,
        title: true,
        href: true,
        kindLabel: true,
        visibility: true,
        ownerUserId: true,
        updatedAt: true,
      },
    }),
    prisma.ragKnowledgeChunk.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        kindLabel: true,
        href: true,
        visibility: true,
        updatedAt: true,
        snippet: true,
      },
    }),
    previewRagQuery(query ?? ""),
    prisma.ragQueryLog.findMany({
      where: {
        createdAt: {
          gte: qualityWindowStart,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 400,
      select: {
        id: true,
        query: true,
        normalizedQuery: true,
        mode: true,
        pathname: true,
        sourceCount: true,
        publicSourceCount: true,
        privateSourceCount: true,
        usedPageContext: true,
        topScore: true,
        topSourceTitle: true,
        topSourceKindLabel: true,
        topSourceHref: true,
        topSourceTitles: true,
        createdAt: true,
      },
    }),
    collectKnowledgeSources(prisma),
  ]);

  const sourceMap = new Map<string, RagSourceSummary>();
  const sourceTypeBreakdownMap = new Map<string, { chunks: number; sources: Set<string> }>();

  for (const chunk of allChunkMeta) {
    const visibility = toVisibilityLabel(chunk.visibility);
    const existingSource = sourceMap.get(chunk.sourceKey);

    if (!existingSource) {
      sourceMap.set(chunk.sourceKey, {
        sourceKey: chunk.sourceKey,
        sourceType: chunk.sourceType,
        title: chunk.title,
        href: chunk.href,
        kindLabel: chunk.kindLabel,
        visibility,
        ownerUserId: chunk.ownerUserId,
        chunkCount: 1,
        updatedAt: chunk.updatedAt,
      });
    } else {
      existingSource.chunkCount += 1;
      if (chunk.updatedAt > existingSource.updatedAt) {
        existingSource.updatedAt = chunk.updatedAt;
      }
    }

    const currentBreakdown = sourceTypeBreakdownMap.get(chunk.sourceType) ?? {
      chunks: 0,
      sources: new Set<string>(),
    };
    currentBreakdown.chunks += 1;
    currentBreakdown.sources.add(chunk.sourceKey);
    sourceTypeBreakdownMap.set(chunk.sourceType, currentBreakdown);
  }

  const sourceTypeBreakdown = Array.from(sourceTypeBreakdownMap.entries())
    .map(([sourceType, value]) => ({
      sourceType,
      chunks: value.chunks,
      sources: value.sources.size,
    }))
    .sort((left, right) => right.chunks - left.chunks);

  const recentSources = Array.from(sourceMap.values())
    .sort(sortByUpdatedAtDesc)
    .slice(0, 10);
  const syncHealthBreakdownMap = new Map<string, RagSyncBreakdownItem>();
  const recentAttentionSources: RagSyncHealthItem[] = [];
  const currentSourceKeys = new Set<string>();
  let indexedSources = 0;
  let syncedSources = 0;
  let missingSources = 0;
  let staleSources = 0;

  for (const source of currentSources) {
    currentSourceKeys.add(source.sourceKey);

    const breakdown = syncHealthBreakdownMap.get(source.sourceType) ?? {
      sourceType: source.sourceType,
      currentSources: 0,
      indexedSources: 0,
      syncedSources: 0,
      missingSources: 0,
      staleSources: 0,
    };
    breakdown.currentSources += 1;

    const indexedSource = sourceMap.get(source.sourceKey);

    if (!indexedSource) {
      missingSources += 1;
      breakdown.missingSources += 1;
      recentAttentionSources.push({
        sourceKey: source.sourceKey,
        sourceType: source.sourceType,
        title: source.title,
        href: source.href,
        kindLabel: source.kindLabel,
        visibility: toVisibilityLabel(source.visibility),
        sourceUpdatedAt: source.updatedAt,
        chunkUpdatedAt: null,
        chunkCount: 0,
        status: "MISSING",
      });
      syncHealthBreakdownMap.set(source.sourceType, breakdown);
      continue;
    }

    indexedSources += 1;
    breakdown.indexedSources += 1;

    if (source.updatedAt.getTime() > indexedSource.updatedAt.getTime()) {
      staleSources += 1;
      breakdown.staleSources += 1;
      recentAttentionSources.push({
        sourceKey: source.sourceKey,
        sourceType: source.sourceType,
        title: source.title,
        href: source.href,
        kindLabel: source.kindLabel,
        visibility: toVisibilityLabel(source.visibility),
        sourceUpdatedAt: source.updatedAt,
        chunkUpdatedAt: indexedSource.updatedAt,
        chunkCount: indexedSource.chunkCount,
        status: "STALE",
      });
      syncHealthBreakdownMap.set(source.sourceType, breakdown);
      continue;
    }

    syncedSources += 1;
    breakdown.syncedSources += 1;
    syncHealthBreakdownMap.set(source.sourceType, breakdown);
  }

  const orphanedSources = Array.from(sourceMap.keys()).filter(
    (sourceKey) => !currentSourceKeys.has(sourceKey),
  ).length;
  const syncHealthBreakdown = Array.from(syncHealthBreakdownMap.values()).sort((left, right) => {
    const rightAttention = right.missingSources + right.staleSources;
    const leftAttention = left.missingSources + left.staleSources;

    if (rightAttention !== leftAttention) {
      return rightAttention - leftAttention;
    }

    return right.currentSources - left.currentSources;
  });
  const recentAttentionSourceList = recentAttentionSources
    .sort((left, right) => right.sourceUpdatedAt.getTime() - left.sourceUpdatedAt.getTime())
    .slice(0, 10);
  const totalQueries = ragQueryLogs.length;
  const chatQueries = ragQueryLogs.filter((entry) => entry.mode === "CHAT");
  const previewQueries = ragQueryLogs.filter((entry) => entry.mode === "PREVIEW");
  const emptyQueries = ragQueryLogs.filter((entry) => entry.sourceCount === 0);
  const successfulQueries = ragQueryLogs.filter((entry) => entry.sourceCount > 0);
  const topQueryMap = new Map<
    string,
    {
      normalizedQuery: string;
      displayQuery: string;
      count: number;
      emptyCount: number;
      totalSources: number;
      lastSeenAt: Date;
      modes: Set<string>;
    }
  >();

  for (const entry of ragQueryLogs) {
    const current = topQueryMap.get(entry.normalizedQuery) ?? {
      normalizedQuery: entry.normalizedQuery,
      displayQuery: entry.query,
      count: 0,
      emptyCount: 0,
      totalSources: 0,
      lastSeenAt: entry.createdAt,
      modes: new Set<string>(),
    };
    current.count += 1;
    current.totalSources += entry.sourceCount;
    current.emptyCount += entry.sourceCount === 0 ? 1 : 0;
    current.modes.add(entry.mode);

    if (entry.createdAt > current.lastSeenAt) {
      current.lastSeenAt = entry.createdAt;
      current.displayQuery = entry.query;
    }

    topQueryMap.set(entry.normalizedQuery, current);
  }

  const topQueries = Array.from(topQueryMap.values())
    .map((entry) => ({
      normalizedQuery: entry.normalizedQuery,
      displayQuery: entry.displayQuery,
      count: entry.count,
      emptyCount: entry.emptyCount,
      averageSourceCount: entry.count > 0 ? entry.totalSources / entry.count : 0,
      lastSeenAt: entry.lastSeenAt,
      modes: Array.from(entry.modes).sort(),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.lastSeenAt.getTime() - left.lastSeenAt.getTime();
    })
    .slice(0, 8);

  return {
    configured: Boolean(embeddingConfig),
    embeddingModel: embeddingConfig?.model ?? null,
    embeddingSource: embeddingConfig?.source ?? null,
    reservations,
    totals: {
      chunks: allChunkMeta.length,
      sources: sourceMap.size,
      publicChunks: allChunkMeta.filter((chunk) => chunk.visibility === RagChunkVisibility.PUBLIC).length,
      privateChunks: allChunkMeta.filter((chunk) => chunk.visibility === RagChunkVisibility.PRIVATE).length,
    },
    qualityWindowDays: RAG_QUALITY_WINDOW_DAYS,
    quality: {
      totalQueries,
      chatQueries: chatQueries.length,
      previewQueries: previewQueries.length,
      emptyQueries: emptyQueries.length,
      emptyRecallRate: totalQueries > 0 ? emptyQueries.length / totalQueries : 0,
      averageSourceCount:
        totalQueries > 0
          ? ragQueryLogs.reduce((sum, entry) => sum + entry.sourceCount, 0) / totalQueries
          : 0,
      averagePublicSourceCount:
        totalQueries > 0
          ? ragQueryLogs.reduce((sum, entry) => sum + entry.publicSourceCount, 0) / totalQueries
          : 0,
      averagePrivateSourceCount:
        totalQueries > 0
          ? ragQueryLogs.reduce((sum, entry) => sum + entry.privateSourceCount, 0) / totalQueries
          : 0,
      usedPageContextQueries: ragQueryLogs.filter((entry) => entry.usedPageContext).length,
    },
    syncHealth: {
      totalEligibleSources: currentSources.length,
      indexedSources,
      syncedSources,
      missingSources,
      staleSources,
      orphanedSources,
      sourceTypeBreakdown: syncHealthBreakdown,
      recentAttentionSources: recentAttentionSourceList,
    },
    latestUpdatedAt:
      allChunkMeta.length > 0
        ? [...allChunkMeta].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0]
            ?.updatedAt ?? null
        : null,
    sourceTypeBreakdown,
    topQueries,
    recentEmptyQueries: emptyQueries.slice(0, 8),
    recentSuccessfulQueries: successfulQueries.slice(0, 8),
    recentSources,
    recentChunks: recentChunks.map((chunk) => ({
      ...chunk,
      visibility: toVisibilityLabel(chunk.visibility),
    })),
    previewQuery: query?.trim() ?? "",
    previewResults,
  };
}
