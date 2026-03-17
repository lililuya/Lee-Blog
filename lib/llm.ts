import { ProviderAdapter } from "@prisma/client";
import { getChatProviderBySlug } from "@/lib/queries";
import type { ChatMessage } from "@/lib/chat/message";

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Image attachments must use a base64 data URL.");
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function buildOpenAiCompatibleContent(message: ChatMessage) {
  if (!message.attachments?.length) {
    return message.content;
  }

  const parts: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "image_url";
        image_url: {
          url: string;
          detail: "auto";
        };
      }
  > = [];

  if (message.content.trim()) {
    parts.push({ type: "text", text: message.content });
  }

  for (const attachment of message.attachments) {
    if (attachment.kind !== "image") {
      continue;
    }

    parts.push({
      type: "image_url",
      image_url: {
        url: attachment.dataUrl,
        detail: "auto",
      },
    });
  }

  return parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts;
}

function buildAnthropicContent(message: ChatMessage) {
  const parts: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "image";
        source: {
          type: "base64";
          media_type: string;
          data: string;
        };
      }
  > = [];

  if (message.content.trim()) {
    parts.push({ type: "text", text: message.content });
  }

  for (const attachment of message.attachments ?? []) {
    if (attachment.kind !== "image") {
      continue;
    }

    const parsed = parseDataUrl(attachment.dataUrl);
    parts.push({
      type: "image",
      source: {
        type: "base64",
        media_type: parsed.mimeType,
        data: parsed.base64,
      },
    });
  }

  return parts.length === 0 ? message.content : parts;
}

export async function requestChatCompletion(providerSlug: string, options: ChatCompletionOptions) {
  const provider = await getChatProviderBySlug(providerSlug);

  if (!provider || !provider.enabled) {
    throw new Error("The requested provider is not enabled.");
  }

  const apiKey = process.env[provider.apiKeyEnv]?.trim();

  if (!apiKey) {
    throw new Error(`Environment variable ${provider.apiKeyEnv} is missing or empty.`);
  }

  const mergedSystemPrompt = [provider.systemPrompt, options.systemPrompt]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join("\n\n");

  if (provider.adapter === ProviderAdapter.OPENAI_COMPATIBLE) {
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          ...(mergedSystemPrompt ? [{ role: "system", content: mergedSystemPrompt }] : []),
          ...options.messages.map((message) => ({
            role: message.role,
            content: buildOpenAiCompatibleContent(message),
          })),
        ],
        temperature: options.temperature ?? 0.35,
        max_tokens: options.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Provider request failed: ${details}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "No response returned.";
  }

  if (provider.adapter === ProviderAdapter.ANTHROPIC) {
    const systemMessage = mergedSystemPrompt || undefined;
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: provider.model,
        system: systemMessage,
        max_tokens: options.maxTokens ?? 1024,
        messages: options.messages
          .filter((message) => message.role !== "system")
          .map((message) => ({
            role: message.role,
            content: buildAnthropicContent(message),
          })),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Provider request failed: ${details}`);
    }

    const data = await response.json();
    return data.content?.map((item: { text?: string }) => item.text ?? "").join("\n") ?? "No response returned.";
  }

  throw new Error("Unsupported provider adapter.");
}
