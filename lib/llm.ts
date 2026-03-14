import { ProviderAdapter } from "@prisma/client";
import { getChatProviderBySlug } from "@/lib/queries";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function requestChatCompletion(providerSlug: string, messages: ChatMessage[]) {
  const provider = await getChatProviderBySlug(providerSlug);

  if (!provider || !provider.enabled) {
    throw new Error("The requested provider is not enabled.");
  }

  const apiKey = process.env[provider.apiKeyEnv]?.trim();

  if (!apiKey) {
    throw new Error(`Environment variable ${provider.apiKeyEnv} is missing or empty.`);
  }

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
          ...(provider.systemPrompt ? [{ role: "system", content: provider.systemPrompt }] : []),
          ...messages,
        ],
        temperature: 0.7,
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
    const systemMessage = provider.systemPrompt ?? undefined;
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
        max_tokens: 1024,
        messages: messages.filter((message) => message.role !== "system"),
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