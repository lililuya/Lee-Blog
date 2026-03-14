import "server-only";
import { requestChatCompletion } from "@/lib/llm";
import { buildRetrievalQuery, retrieveChatContext } from "@/lib/chat/retrieval";
import type { ChatOrchestratorInput, ChatReply } from "@/lib/chat/types";

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildRagSystemPrompt(context: Awaited<ReturnType<typeof retrieveChatContext>>) {
  const contextHeader = [
    "You are the grounded research assistant for this site.",
    "Answer in the user's language when possible.",
    "Prefer retrieved site knowledge over generic statements when the user asks about the site's writing, notes, papers, digests, or research workflow.",
    "If the retrieved context is insufficient, say what is grounded and what is only your general reasoning.",
    "Do not invent quotes, citations, paper claims, or personal facts that are not supported by the retrieved context.",
    "When the user is reading a page, prioritize that current-page context before broader site knowledge.",
  ].join("\n");

  if (context.sources.length === 0) {
    return `${contextHeader}\n\nNo retrieved site context was available for this request.`;
  }

  const formattedSources = context.sources
    .map((source, index) => {
      const qualifiers = [
        source.kindLabel,
        source.visibility === "private" ? "private source" : "public source",
        source.isCurrentPage ? "current page context" : null,
      ]
        .filter(Boolean)
        .join(" | ");

      return [
        `[Source ${index + 1}] ${source.title}`,
        `Meta: ${qualifiers}`,
        `Path: ${source.href}`,
        `Snippet: ${truncate(source.snippet, 280)}`,
        `Context: ${source.content}`,
      ].join("\n");
    })
    .join("\n\n");

  return `${contextHeader}\n\nRetrieved site context for this request:\n${formattedSources}`;
}

export async function generateChatReply(input: ChatOrchestratorInput): Promise<ChatReply> {
  const retrievalQuery = buildRetrievalQuery(input.messages);

  if (!retrievalQuery) {
    throw new Error("The chat request did not include a user message.");
  }

  const context = await retrieveChatContext({
    query: retrievalQuery,
    pathname: input.pathname,
    currentUser: input.currentUser,
  });

  const content = await requestChatCompletion(input.providerSlug, {
    messages: input.messages,
    systemPrompt: buildRagSystemPrompt(context),
    temperature: 0.25,
    maxTokens: 1024,
  });

  return {
    content,
    citations: context.sources.map((source) => ({
      id: source.id,
      title: source.title,
      href: source.href,
      kindLabel: source.kindLabel,
      snippet: source.snippet,
      visibility: source.visibility,
      isCurrentPage: source.isCurrentPage,
    })),
    retrievalQuery: context.query,
    usedPageContext: context.usedPageContext,
  };
}
