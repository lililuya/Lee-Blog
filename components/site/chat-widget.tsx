"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircle, MessageCircleMore, SendHorizontal, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatProvider = {
  id: string;
  name: string;
  slug: string;
  model: string;
  adapter: string;
};

type ChatWidgetProps = {
  providers: ChatProvider[];
  currentUser: {
    name: string;
    role?: string;
  } | null;
};

type WidgetMessage = {
  role: "user" | "assistant";
  content: string;
};

function getInitialAssistantMessage(currentUser: ChatWidgetProps["currentUser"], providers: ChatProvider[]) {
  if (!currentUser) {
    return "登录以使用网站聊天小部件。登录后，您可以从已启用的模型中选择。";
  }

  if (providers.length === 0) {
    return "目前尚无已启用的聊天模型。管理员需要启用一个提供商，并确保其 API 密钥已配置。";
  }

  return "选择一个已启用的模型，并就网站、你的写作或研究工作流程提出一个聚焦的问题。";
}

export function ChatWidget({ providers, currentUser }: ChatWidgetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(providers[0]?.slug ?? "");
  const [messages, setMessages] = useState<WidgetMessage[]>([
    {
      role: "assistant",
      content: getInitialAssistantMessage(currentUser, providers),
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canChat = Boolean(currentUser) && providers.length > 0 && Boolean(selectedProvider);
  const isReadingPage = /^\/(?:blog|digest|notes)\/[^/]+$/.test(pathname);
  const loginHref = pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login";
  const selectedLabel = useMemo(
    () => providers.find((provider) => provider.slug === selectedProvider)?.name ?? "No model selected",
    [providers, selectedProvider],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() || !selectedProvider || !currentUser) {
      return;
    }

    const nextUserMessage: WidgetMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerSlug: selectedProvider,
            messages: nextMessages,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Chat failed.");
        }

        setMessages((current) => [...current, { role: "assistant", content: data.content }]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Chat failed.");
      }
    });
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-[70] flex flex-col items-end gap-4 transition-[bottom] duration-300 md:right-6",
        isReadingPage ? "bottom-24 md:bottom-20" : "bottom-6",
      )}
    >
      {isOpen ? (
        <div className="theme-chat-shell w-[min(92vw,24rem)] overflow-hidden rounded-[1.8rem] border shadow-[0_32px_70px_rgba(20,33,43,0.14)] backdrop-blur-2xl">
          <div className="theme-chat-header flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Sparkles className="h-4 w-4" />
                Workspace Chat
              </div>
              <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">Current model: {selectedLabel}</p>
            </div>
            <button
              type="button"
              className="theme-icon-button rounded-full p-2 text-[var(--ink-soft)]"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 border-b border-black/6 px-5 py-4">
            {currentUser ? (
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">Model</span>
                <select
                  className="field"
                  value={selectedProvider}
                  onChange={(event) => setSelectedProvider(event.target.value)}
                  disabled={providers.length === 0}
                >
                  {providers.length > 0 ? (
                    providers.map((provider) => (
                      <option key={provider.id} value={provider.slug}>
                        {provider.name} | {provider.model}
                      </option>
                    ))
                  ) : (
                    <option>No enabled models</option>
                  )}
                </select>
              </label>
            ) : null}

            {!currentUser ? (
              <div className="rounded-2xl bg-[rgba(168,123,53,0.1)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                Chat is available only after login.
                <Link href={loginHref} className="ml-1 font-semibold text-[var(--accent-strong)]">
                  Sign in now
                </Link>
              </div>
            ) : null}

            {currentUser && providers.length === 0 ? (
              <div className="rounded-2xl bg-[rgba(20,33,43,0.05)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                No model is currently available to this widget. Enable a provider in the admin panel and make sure the matching API key environment variable is set.
                {currentUser.role === "ADMIN" ? (
                  <Link href="/admin/providers" className="ml-1 font-semibold text-[var(--accent-strong)]">
                    Open provider settings
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="max-h-96 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                  message.role === "assistant" ? "theme-chat-bubble-assistant" : "theme-chat-bubble-user ml-auto"
                }`}
              >
                {message.content}
              </div>
            ))}
            {isPending ? (
              <div className="theme-chat-bubble-assistant inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[var(--ink-soft)]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Generating a reply...
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 border-t border-black/6 px-5 py-4">
            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div> : null}
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              className="field resize-none"
              placeholder={
                !currentUser
                  ? "Sign in to use chat."
                  : providers.length === 0
                    ? "No enabled models are available."
                    : "Ask a question about the site, your notes, or your research workflow..."
              }
              disabled={!canChat || isPending}
            />
            <button
              type="submit"
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canChat || isPending || !input.trim()}
            >
              <SendHorizontal className="h-4 w-4" />
              Send Message
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,_rgba(27,107,99,1),_rgba(16,69,63,1))] text-white shadow-[0_24px_55px_rgba(16,69,63,0.28)] transition hover:-translate-y-1"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open chat widget"
      >
        <MessageCircleMore className="h-7 w-7" />
      </button>
    </div>
  );
}
