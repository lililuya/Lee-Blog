"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";

type ResetPasswordFormProps = {
  token: string;
};

type ResetFeedback = {
  tone: "success" | "error";
  message: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [feedback, setFeedback] = useState<ResetFeedback | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            password,
            confirmPassword,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          setFeedback({
            tone: "error",
            message: data.error ?? "无法重置密码。",
          });
          return;
        }

        form.reset();
        setFeedback({
          tone: "success",
          message: "密码已更新，现在可以使用新密码登录。",
        });
      } catch {
        setFeedback({
          tone: "error",
          message: "无法重置密码，请稍后再试。",
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
        <span className="text-sm font-semibold text-[var(--ink)]">新密码</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          placeholder="至少 8 位字符"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">确认新密码</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          placeholder="再次输入新密码"
        />
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
          {feedback.tone === "success" ? (
            <Link href="/login" className="mt-2 inline-flex font-semibold text-[var(--accent-strong)]">
              前往登录
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        重置密码
      </button>
    </form>
  );
}
