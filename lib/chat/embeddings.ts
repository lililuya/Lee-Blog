import { ProviderAdapter } from "@prisma/client";
import { getChatProviderBySlug, getEnabledChatProviders } from "@/lib/queries";

export type EmbeddingPurpose = "text" | "multimodal";

type EmbeddingConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  purpose: EmbeddingPurpose;
  source: "direct-env" | "provider";
};

type EmbeddingSlotEnv = {
  purpose: EmbeddingPurpose;
  baseUrl: string | null;
  apiKeyEnv: string | null;
  providerSlug: string | null;
  model: string | null;
};

function readValue(name: string) {
  return process.env[name]?.trim() || null;
}

function readEmbeddingSlotEnv(purpose: EmbeddingPurpose): EmbeddingSlotEnv {
  if (purpose === "text") {
    return {
      purpose,
      baseUrl: readValue("RAG_TEXT_EMBEDDING_BASE_URL"),
      apiKeyEnv: readValue("RAG_TEXT_EMBEDDING_API_KEY_ENV"),
      providerSlug:
        readValue("RAG_TEXT_EMBEDDING_PROVIDER_SLUG") ?? readValue("RAG_EMBEDDING_PROVIDER_SLUG"),
      model: readValue("RAG_TEXT_EMBEDDING_MODEL") ?? readValue("RAG_EMBEDDING_MODEL"),
    };
  }

  return {
    purpose,
    baseUrl: readValue("RAG_MULTIMODAL_EMBEDDING_BASE_URL"),
    apiKeyEnv: readValue("RAG_MULTIMODAL_EMBEDDING_API_KEY_ENV"),
    providerSlug: readValue("RAG_MULTIMODAL_EMBEDDING_PROVIDER_SLUG"),
    model: readValue("RAG_MULTIMODAL_EMBEDDING_MODEL"),
  };
}

function resolveApiKey(apiKeyEnv: string | null) {
  if (!apiKeyEnv) {
    return null;
  }

  return process.env[apiKeyEnv]?.trim() || null;
}

function resolveMaxBatchSize(config: EmbeddingConfig) {
  if (
    config.baseUrl.includes("dashscope.aliyuncs.com") ||
    config.model === "text-embedding-v4" ||
    config.model === "qwen3-vl-embedding"
  ) {
    return 10;
  }

  return 64;
}

function resolveDirectEmbeddingConfig(slot: EmbeddingSlotEnv): EmbeddingConfig | null {
  if (!slot.model || !slot.baseUrl || !slot.apiKeyEnv) {
    return null;
  }

  const apiKey = resolveApiKey(slot.apiKeyEnv);

  if (!apiKey) {
    return null;
  }

  return {
    baseUrl: slot.baseUrl.replace(/\/$/, ""),
    apiKey,
    model: slot.model,
    purpose: slot.purpose,
    source: "direct-env",
  };
}

async function resolveEmbeddingProvider(slot: EmbeddingSlotEnv) {
  if (slot.providerSlug) {
    return getChatProviderBySlug(slot.providerSlug);
  }

  if (slot.purpose !== "text") {
    return null;
  }

  const providers = await getEnabledChatProviders();
  return (
    providers.find((provider) => provider.adapter === ProviderAdapter.OPENAI_COMPATIBLE) ?? null
  );
}

export async function getRagEmbeddingConfig(
  purpose: EmbeddingPurpose = "text",
): Promise<EmbeddingConfig | null> {
  const slot = readEmbeddingSlotEnv(purpose);

  if (!slot.model) {
    return null;
  }

  const directConfig = resolveDirectEmbeddingConfig(slot);

  if (directConfig) {
    return directConfig;
  }

  const provider = await resolveEmbeddingProvider(slot);

  if (!provider || !provider.enabled || provider.adapter !== ProviderAdapter.OPENAI_COMPATIBLE) {
    return null;
  }

  const apiKey = resolveApiKey(provider.apiKeyEnv);

  if (!apiKey) {
    return null;
  }

  return {
    baseUrl: provider.baseUrl.replace(/\/$/, ""),
    apiKey,
    model: slot.model,
    purpose,
    source: "provider",
  };
}

export function getRagEmbeddingReservations() {
  const text = readEmbeddingSlotEnv("text");
  const multimodal = readEmbeddingSlotEnv("multimodal");

  return {
    text,
    multimodal,
  };
}

export async function embedTexts(
  texts: string[],
  options?: {
    batchSize?: number;
  },
): Promise<number[][]> {
  const config = await getRagEmbeddingConfig("text");

  if (!config) {
    throw new Error(
      "Text RAG embedding is not configured. Set RAG_TEXT_EMBEDDING_MODEL (or legacy RAG_EMBEDDING_MODEL) and a direct endpoint or valid OPENAI_COMPATIBLE provider.",
    );
  }

  if (texts.length === 0) {
    return [];
  }

  const batchSize = Math.max(1, Math.min(options?.batchSize ?? 16, resolveMaxBatchSize(config)));
  const embeddings: number[][] = [];

  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: batch,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Embedding request failed: ${details}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ index: number; embedding: number[] }>;
    };

    const ordered = (data.data ?? [])
      .slice()
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);

    if (ordered.length !== batch.length) {
      throw new Error("Embedding response length does not match the request batch.");
    }

    embeddings.push(...ordered);
  }

  return embeddings;
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
