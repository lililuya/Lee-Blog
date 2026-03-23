"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";

type RequestFeedback = {
  tone: "success" | "error";
  message: string;
  resetUrl?: string | null;
};

export function PasswordResetRequestForm() {
  const [feedback, setFeedback] = useState<RequestFeedback | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          setFeedback({
            tone: "error",
            message: data.error ?? "无法发起密码重置流程。",
          });
          return;
        }

        form.reset();
        setFeedback({
          tone: "success",
          message: data.resetUrl
            ? "已生成密码重置链接。当前还未配置邮件投递，请先使用下方链接。"
            : "如果该邮箱对应的账号存在，系统已经准备好了密码重置链接。",
          resetUrl: data.resetUrl ?? null,
        });
      } catch {
        setFeedback({
          tone: "error",
          message: "无法发起密码重置流程，请稍后再试。",
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="editorial-form-shell space-y-5 md:p-7"
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">邮箱</span>
        <input name="email" type="email" required className="field" placeholder="you@example.com" />
      </label>

      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          }
        >
          <p>{feedback.message}</p>
          {feedback.resetUrl ? (
            <a
              href={feedback.resetUrl}
              className="mt-2 inline-flex break-all font-semibold text-[var(--accent-strong)]"
            >
              打开重置链接
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        发送重置链接
      </button>
    </form>
  );
}
