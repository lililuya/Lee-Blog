import { ProviderAdapter } from "@prisma/client";
import { getChatProviderBySlug } from "@/lib/queries";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

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
          ...options.messages,
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
        messages: options.messages.filter((message) => message.role !== "system"),
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
