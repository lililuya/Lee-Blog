"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

type AuthFormProps = {
  mode: "login" | "register";
  nextPath?: string;
};

type AuthFeedback = {
  tone: "error" | "success";
  message: string;
  code?: string;
  email?: string;
  verificationUrl?: string | null;
};

export function AuthForm({ mode, nextPath = "/admin" }: AuthFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null);

  async function resendVerificationEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFeedback({
        tone: "error",
        message: "Please enter your email address first.",
      });
      return;
    }

    startResendTransition(async () => {
      try {
        const response = await fetch("/api/auth/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          setFeedback({
            tone: "error",
            message: data.error ?? "Could not resend the verification email.",
            email: normalizedEmail,
          });
          return;
        }

        setFeedback({
          tone: "success",
          message: data.emailSent
            ? `A fresh verification email has been sent to ${normalizedEmail}.`
            : `Email delivery is not configured yet. Use the verification link below for now.`,
          email: normalizedEmail,
          verificationUrl: data.verificationUrl ?? null,
        });
      } catch {
        setFeedback({
          tone: "error",
          message: "Could not resend the verification email. Please try again.",
          email: normalizedEmail,
        });
      }
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const isTwoFactorStep = mode === "login" && Boolean(twoFactorEmail);
    const payload = Object.fromEntries(formData.entries());
    const endpoint = isTwoFactorStep
      ? "/api/auth/2fa/verify"
      : mode === "login"
        ? "/api/auth/login"
        : "/api/auth/register";
    const email = String((isTwoFactorStep ? twoFactorEmail : payload.email) ?? "")
      .trim()
      .toLowerCase();

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          if (isTwoFactorStep && data.code !== "TWO_FACTOR_INVALID") {
            setTwoFactorEmail(null);
          }

          setFeedback({
            tone: "error",
            message: data.error ?? "Submission failed. Please try again.",
            code: data.code,
            email: data.email ?? email,
            verificationUrl: data.verificationUrl ?? null,
          });
          return;
        }

        if (mode === "login" && data.requiresTwoFactor) {
          setTwoFactorEmail(email);
          form.reset();
          setFeedback({
            tone: "success",
            message: `Password verified for ${email}. Enter the 6-digit code from your authenticator app to finish signing in.`,
            email,
          });
          return;
        }

        if (mode === "register") {
          form.reset();
          setFeedback({
            tone: "success",
            message: data.resent
              ? data.emailSent
                ? `This email is already registered but still waiting for verification. We sent a fresh verification link to ${data.email}.`
                : "This email is already registered but still waiting for verification. Use the verification link below for now."
              : data.emailSent
                ? `Account created. We sent a verification link to ${data.email}. Please verify your email before signing in.`
                : "Account created, but email delivery is not configured yet. Use the verification link below for now.",
            email: data.email ?? email,
            verificationUrl: data.verificationUrl ?? null,
          });
          return;
        }

        setTwoFactorEmail(null);
        const redirectTarget =
          data.user?.role === "ADMIN" ? nextPath : nextPath === "/admin" ? "/" : nextPath;

        router.push(redirectTarget);
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: "Submission failed. Please try again.",
          email,
        });
      }
    });
  }

  const canResendVerification = Boolean(
    !twoFactorEmail &&
      feedback?.email &&
      (mode === "register" || feedback.code === "EMAIL_NOT_VERIFIED"),
  );

  async function resetTwoFactorStep() {
    try {
      await fetch("/api/auth/2fa/cancel", {
        method: "POST",
      });
    } catch {
      // Ignore cleanup failures and let the user continue with a fresh login.
    }

    setTwoFactorEmail(null);
    setFeedback(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[2rem] border border-black/8 bg-white/84 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {mode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Display name</span>
          <input name="name" required minLength={2} className="field" placeholder="Your name" />
        </label>
      ) : null}
      {mode === "login" && twoFactorEmail ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(27,107,99,0.16)] bg-[rgba(27,107,99,0.06)] px-4 py-3 text-sm text-[var(--ink-soft)]">
            <p className="font-semibold text-[var(--ink)]">Two-factor verification</p>
            <p className="mt-1 break-all">
              Signing in as <span className="font-medium text-[var(--ink)]">{twoFactorEmail}</span>
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Authenticator code</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={12}
              className="field"
              placeholder="123456"
            />
          </label>
        </div>
      ) : (
        <>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
            <input
              name="email"
              type="email"
              required
              className="field"
              placeholder="you@example.com"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="field"
              placeholder="At least 8 characters"
            />
          </label>
        </>
      )}
      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          }
        >
          <p>{feedback.message}</p>
          {feedback.verificationUrl ? (
            <a
              href={feedback.verificationUrl}
              className="mt-2 inline-flex break-all font-semibold text-[var(--accent-strong)]"
            >
              Open verification link
            </a>
          ) : null}
          {canResendVerification && feedback.email ? (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => {
                void resendVerificationEmail(feedback.email!);
              }}
              disabled={isResending || isPending}
            >
              {isResending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Resend verification email
            </button>
          ) : null}
        </div>
      ) : null}
      <button
        type="submit"
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? (twoFactorEmail ? "Verify code" : "Sign in") : "Create account"}
      </button>
      {mode === "login" && twoFactorEmail ? (
        <button
          type="button"
          className="btn-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
          onClick={() => {
            void resetTwoFactorStep();
          }}
          disabled={isPending || isResending}
        >
          Use a different account
        </button>
      ) : null}
      {mode === "register" ? (
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          New reader accounts need email verification before they can sign in and comment.
        </p>
      ) : null}
    </form>
  );
}
