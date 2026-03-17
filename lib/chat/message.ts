export type ChatAttachment = {
  id: string;
  kind: "image";
  mimeType: string;
  dataUrl: string;
  name?: string | null;
  width?: number | null;
  height?: number | null;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

export function getChatMessageText(message: Pick<ChatMessage, "content">) {
  return message.content.trim();
}

export function hasChatAttachments(message: Pick<ChatMessage, "attachments">) {
  return (message.attachments?.length ?? 0) > 0;
}
