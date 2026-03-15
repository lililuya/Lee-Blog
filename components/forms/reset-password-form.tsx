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
            message: data.error ?? "Could not reset the password.",
          });
          return;
        }

        form.reset();
        setFeedback({
          tone: "success",
          message: "Password updated. You can now sign in with your new password.",
        });
      } catch {
        setFeedback({
          tone: "error",
          message: "Could not reset the password. Please try again.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[2rem] border border-black/8 bg-white/84 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          placeholder="At least 8 characters"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          placeholder="Repeat the new password"
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
              Go to sign in
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
        Reset password
      </button>
    </form>
  );
}
