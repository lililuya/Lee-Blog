import "server-only";

import { ProviderAdapter } from "@prisma/client";
import { debugFunAsrTranscription, transcribeAudioWithOpenAiCompatibleDetailed } from "@/lib/chat/transcription";
import { validateObjectStorageConnection } from "@/lib/media-storage";

type ChatValidationInput = {
  adapter: ProviderAdapter;
  baseUrl: string;
  model: string;
  apiKey: string;
  prompt: string;
  systemPrompt?: string;
};

type SpeechValidationInput = {
  providerId: "funasr" | "openai-compatible";
  audio: Uint8Array;
  filename?: string;
  mimeType: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  prompt?: string;
  language?: string;
};

function truncatePreview(value: string, maxLength = 1_600) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function buildAnthropicRequestBody(input: ChatValidationInput) {
  return {
    model: input.model,
    system: input.systemPrompt?.trim() || undefined,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: input.prompt,
      },
    ],
  };
}

function buildOpenAiCompatibleRequestBody(input: ChatValidationInput) {
  return {
    model: input.model,
    temperature: 0.2,
    max_tokens: 512,
    messages: [
      ...(input.systemPrompt?.trim()
        ? [
            {
              role: "system",
              content: input.systemPrompt.trim(),
            },
          ]
        : []),
      {
        role: "user",
        content: input.prompt,
      },
    ],
  };
}

function readOpenAiMessageContent(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }

        if (
          entry &&
          typeof entry === "object" &&
          "text" in entry &&
          typeof entry.text === "string"
        ) {
          return entry.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

export async function validateChatApiRequest(input: ChatValidationInput) {
  if (input.adapter === ProviderAdapter.OPENAI_COMPATIBLE) {
    const endpoint = `${input.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(buildOpenAiCompatibleRequestBody(input)),
    });
    const rawBody = await response.text();

    if (!response.ok) {
      throw new Error(
        `OpenAI-compatible validation failed (${response.status}): ${truncatePreview(rawBody)}`,
      );
    }

    let content = "";

    try {
      const data = JSON.parse(rawBody) as {
        choices?: Array<{
          message?: {
            content?: unknown;
          };
        }>;
      };

      content = readOpenAiMessageContent(data.choices?.[0]?.message?.content);
    } catch {
      content = rawBody.trim();
    }

    return {
      kind: "llm-openai-compatible" as const,
      endpoint,
      adapter: input.adapter,
      model: input.model,
      contentPreview: truncatePreview(content || rawBody),
      rawResponsePreview: truncatePreview(rawBody),
    };
  }

  if (input.adapter === ProviderAdapter.ANTHROPIC) {
    const endpoint = `${input.baseUrl.replace(/\/$/, "")}/messages`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(buildAnthropicRequestBody(input)),
    });
    const rawBody = await response.text();

    if (!response.ok) {
      throw new Error(
        `Anthropic validation failed (${response.status}): ${truncatePreview(rawBody)}`,
      );
    }

    let content = "";

    try {
      const data = JSON.parse(rawBody) as {
        content?: Array<{
          text?: string;
        }>;
      };
      content = data.content?.map((item) => item.text ?? "").join("\n").trim() ?? "";
    } catch {
      content = rawBody.trim();
    }

    return {
      kind: "llm-anthropic" as const,
      endpoint,
      adapter: input.adapter,
      model: input.model,
      contentPreview: truncatePreview(content || rawBody),
      rawResponsePreview: truncatePreview(rawBody),
    };
  }

  throw new Error("Unsupported chat adapter.");
}

export async function validateSpeechApiRequest(input: SpeechValidationInput) {
  if (input.providerId === "funasr") {
    const result = await debugFunAsrTranscription({
      audio: input.audio,
      mimeType: input.mimeType,
      sampleRate: 16_000,
      apiKey: input.apiKey,
      model: input.model,
    });

    return {
      kind: "stt-funasr" as const,
      providerId: input.providerId,
      model: result.model,
      transcript: result.transcript,
      debugEvents: result.debugEvents,
    };
  }

  if (input.providerId === "openai-compatible") {
    if (!input.baseUrl?.trim() || !input.model?.trim()) {
      throw new Error("OpenAI-compatible speech validation requires both base URL and model.");
    }

    const result = await transcribeAudioWithOpenAiCompatibleDetailed({
      audio: input.audio,
      filename: input.filename,
      mimeType: input.mimeType,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl.trim(),
      model: input.model.trim(),
      prompt: input.prompt,
      language: input.language,
    });

    return {
      kind: "stt-openai-compatible" as const,
      providerId: input.providerId,
      endpoint: result.endpoint,
      model: result.model,
      transcript: result.transcript,
      rawResponsePreview: result.responsePreview,
    };
  }

  throw new Error("Unsupported speech validation provider.");
}

export async function validateObjectStorageRequest() {
  return validateObjectStorageConnection();
}
