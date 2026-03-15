import "server-only";

import { RagChunkVisibility } from "@prisma/client";
import { cosineSimilarity, embedTexts, getRagEmbeddingConfig, getRagEmbeddingReservations } from "@/lib/chat/embeddings";
import { buildKnowledgeChunks } from "@/lib/chat/knowledge";
import { prisma } from "@/lib/prisma";
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

function sortByUpdatedAtDesc(left: { updatedAt: Date }, right: { updatedAt: Date }) {
  return right.updatedAt.getTime() - left.updatedAt.getTime();
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

  return Array.from(grouped.values())
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.hitCount - left.hitCount;
    })
    .slice(0, 8);
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
      latestUpdatedAt: null as Date | null,
      sourceTypeBreakdown: [] as Array<{ sourceType: string; chunks: number; sources: number }>,
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

  const [allChunkMeta, recentChunks, previewResults] = await Promise.all([
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
  ]);

  const sourceMap = new Map<string, RagSourceSummary>();
  const sourceTypeBreakdownMap = new Map<string, { chunks: number; sources: Set<string> }>();

  for (const chunk of allChunkMeta) {
    const visibility = chunk.visibility === RagChunkVisibility.PRIVATE ? "PRIVATE" : "PUBLIC";
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
    latestUpdatedAt:
      allChunkMeta.length > 0
        ? [...allChunkMeta].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0]
            ?.updatedAt ?? null
        : null,
    sourceTypeBreakdown,
    recentSources,
    recentChunks: recentChunks.map((chunk) => ({
      ...chunk,
      visibility: chunk.visibility === RagChunkVisibility.PRIVATE ? "PRIVATE" : "PUBLIC",
    })),
    previewQuery: query?.trim() ?? "",
    previewResults,
  };
}
