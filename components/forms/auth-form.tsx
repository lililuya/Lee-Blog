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
        message: "请先输入邮箱地址。",
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
            message: data.error ?? "重新发送验证邮件失败。",
            email: normalizedEmail,
          });
          return;
        }

        setFeedback({
          tone: "success",
          message: data.emailSent
            ? `新的验证邮件已发送至 ${normalizedEmail}。`
            : "当前还未配置邮件投递，请先使用下方验证链接。",
          email: normalizedEmail,
          verificationUrl: data.verificationUrl ?? null,
        });
      } catch {
        setFeedback({
          tone: "error",
          message: "重新发送验证邮件失败，请稍后再试。",
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
            message: data.error ?? "提交失败，请稍后再试。",
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
            message: `${email} 的密码已验证，请输入身份验证器里的 6 位验证码完成登录。`,
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
                ? `该邮箱已注册，但仍在等待验证。我们已向 ${data.email} 重新发送验证链接。`
                : "该邮箱已注册，但仍在等待验证。当前还未配置邮件投递，请先使用下方验证链接。"
              : data.emailSent
                ? `账号已创建。我们已向 ${data.email} 发送验证链接，请先完成邮箱验证再登录。`
                : "账号已创建，但当前还未配置邮件投递，请先使用下方验证链接。",
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
          message: "提交失败，请稍后再试。",
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
      className="editorial-form-shell space-y-5 md:p-7"
    >
      {mode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">显示名称</span>
          <input name="name" required minLength={2} className="field" placeholder="你的称呼" />
        </label>
      ) : null}
      {mode === "login" && twoFactorEmail ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(27,107,99,0.16)] bg-[rgba(27,107,99,0.06)] px-4 py-3 text-sm text-[var(--ink-soft)]">
            <p className="font-semibold text-[var(--ink)]">两步验证</p>
            <p className="mt-1 break-all">
              正在登录账号 <span className="font-medium text-[var(--ink)]">{twoFactorEmail}</span>
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">验证码</span>
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
            <span className="text-sm font-semibold text-[var(--ink)]">邮箱</span>
            <input
              name="email"
              type="email"
              required
              className="field"
              placeholder="you@example.com"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">密码</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="field"
              placeholder="至少 8 位字符"
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
              打开验证链接
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
              重新发送验证邮件
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
        {mode === "login" ? (twoFactorEmail ? "验证验证码" : "登录") : "创建账号"}
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
          换一个账号
        </button>
      ) : null}
      {mode === "register" ? (
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          新注册账号需要先完成邮箱验证，之后才能登录和参与评论。
        </p>
      ) : null}
    </form>
  );
}
