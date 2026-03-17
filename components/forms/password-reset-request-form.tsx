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
            message: data.error ?? "Could not start the password reset flow.",
          });
          return;
        }

        form.reset();
        setFeedback({
          tone: "success",
          message: data.resetUrl
            ? "A password reset link was prepared. Email delivery is not configured yet, so use the link below."
            : "If an account with that email exists, a password reset link has been prepared.",
          resetUrl: data.resetUrl ?? null,
        });
      } catch {
        setFeedback({
          tone: "error",
          message: "Could not start the password reset flow. Please try again.",
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
        <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
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
              Open password reset link
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
        Send reset link
      </button>
    </form>
  );
}
