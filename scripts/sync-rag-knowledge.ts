import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { embedTexts, getRagEmbeddingConfig } from "../lib/chat/embeddings";
import { buildKnowledgeChunks } from "../lib/chat/knowledge";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for RAG knowledge sync.");
  }

  const embeddingConfig = await getRagEmbeddingConfig("text");

  if (!embeddingConfig) {
    throw new Error(
      "Text RAG embedding is not configured. Set RAG_TEXT_EMBEDDING_MODEL (or legacy RAG_EMBEDDING_MODEL) and a direct endpoint or valid OPENAI_COMPATIBLE provider.",
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
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

    console.log(
      JSON.stringify(
        {
          embeddingModel: embeddingConfig.model,
          sources: new Set(chunkRecords.map((chunk) => chunk.sourceKey)).size,
          chunks: chunkRecords.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
