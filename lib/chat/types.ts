import type { CurrentUser } from "@/lib/auth";
import type { ChatMessage } from "@/lib/chat/message";

export type ChatCitation = {
  id: string;
  title: string;
  href: string;
  kindLabel: string;
  snippet: string;
  visibility: "public" | "private";
  isCurrentPage: boolean;
};

export type RetrievedChatSource = ChatCitation & {
  score: number;
  content: string;
};

export type ChatReply = {
  content: string;
  citations: ChatCitation[];
  retrievalQuery: string;
  usedPageContext: boolean;
};

export type ChatOrchestratorInput = {
  providerSlug: string;
  messages: ChatMessage[];
  pathname?: string | null;
  currentUser: NonNullable<CurrentUser>;
};
