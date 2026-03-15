import "server-only";
import { RagChunkVisibility } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";
import { cosineSimilarity, getRagEmbeddingConfig, embedTexts } from "@/lib/chat/embeddings";
import type { RetrievedChatSource } from "@/lib/chat/types";

export async function retrieveSemanticCandidates(
  query: string,
  currentUser: NonNullable<CurrentUser>,
): Promise<RetrievedChatSource[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const config = await getRagEmbeddingConfig("text");

  if (!config) {
    return [];
  }

  const chunks = await prisma.ragKnowledgeChunk.findMany({
    where: {
      OR: [
        { visibility: RagChunkVisibility.PUBLIC },
        { visibility: RagChunkVisibility.PRIVATE, ownerUserId: currentUser.id },
      ],
    },
    select: {
      sourceKey: true,
      title: true,
      href: true,
      kindLabel: true,
      visibility: true,
      snippet: true,
      content: true,
      embedding: true,
    },
  });

  if (chunks.length === 0) {
    return [];
  }

  const [queryEmbedding] = await embedTexts([query]);
  const groupedSources = new Map<
    string,
    {
      id: string;
      title: string;
      href: string;
      kindLabel: string;
      visibility: "public" | "private";
      snippet: string;
      content: string;
      bestSimilarity: number;
      hitCount: number;
    }
  >();

  for (const chunk of chunks) {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

    if (similarity < 0.22) {
      continue;
    }

    const current = groupedSources.get(chunk.sourceKey);

    if (!current) {
      groupedSources.set(chunk.sourceKey, {
        id: chunk.sourceKey,
        title: chunk.title,
        href: chunk.href,
        kindLabel: chunk.kindLabel,
        visibility: chunk.visibility === RagChunkVisibility.PRIVATE ? "private" : "public",
        snippet: chunk.snippet,
        content: chunk.content,
        bestSimilarity: similarity,
        hitCount: 1,
      });
      continue;
    }

    current.hitCount += 1;

    if (similarity > current.bestSimilarity) {
      current.bestSimilarity = similarity;
      current.snippet = chunk.snippet;
      current.content = chunk.content;
    }
  }

  return [...groupedSources.values()]
    .map((source) => ({
      id: source.id,
      title: source.title,
      href: source.href,
      kindLabel: source.kindLabel,
      visibility: source.visibility,
      isCurrentPage: false,
      snippet: source.snippet,
      content: source.content,
      score:
        Math.round(source.bestSimilarity * 100) +
        Math.min(16, Math.max(0, source.hitCount - 1) * 4),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}
