import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { PasswordResetRequestForm } from "@/components/forms/password-reset-request-form";
import { isDatabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="container-shell grid min-h-[calc(100vh-9rem)] gap-8 py-16 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
      <section className="space-y-6">
        <p className="section-kicker">Security</p>
        <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
          Reset your password.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Enter the email address you used to register. If the account exists, we will prepare a reset link.
        </p>
        {!isDatabaseConfigured() ? (
          <div className="rounded-[1.6rem] border border-dashed border-[rgba(168,123,53,0.4)] bg-[rgba(168,123,53,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            The database is not configured yet, so password reset is unavailable in this environment.
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="outline-card rounded-[1.6rem] p-5">
            <Mail className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">Email delivery</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              SMTP delivery is supported, and local preview links remain available while mail is still being configured.
            </p>
          </div>
          <div className="outline-card rounded-[1.6rem] p-5">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">One active link</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Every new request replaces older reset links so you only have one valid recovery link at a time.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <PasswordResetRequestForm />
        <p className="text-sm text-[var(--ink-soft)]">
          Remembered it?
          <Link href="/login" className="ml-2 font-semibold text-[var(--accent-strong)]">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
