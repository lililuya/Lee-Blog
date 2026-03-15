import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { inspectPasswordResetToken } from "@/lib/password-reset";
import { formatDate, isDatabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ResetPasswordPageSearchParams = {
  token?: string;
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<ResetPasswordPageSearchParams>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!isDatabaseConfigured()) {
    return (
      <div className="container-shell py-16">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-dashed border-[rgba(168,123,53,0.4)] bg-[rgba(168,123,53,0.08)] p-8 text-sm leading-7 text-[var(--ink-soft)]">
          Password reset is unavailable because the database is not configured in this environment.
        </section>
      </div>
    );
  }

  const tokenState = await inspectPasswordResetToken(token);

  return (
    <div className="container-shell grid min-h-[calc(100vh-9rem)] gap-8 py-16 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
      <section className="space-y-6">
        <p className="section-kicker">Security</p>
        <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
          Choose a new password.
        </h1>

        {tokenState.status === "valid" ? (
          <>
            <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
              Set a fresh password for <span className="font-semibold text-[var(--ink)]">{tokenState.email}</span>.
            </p>
            <div className="rounded-[1.6rem] border border-black/8 bg-white/75 p-5 text-sm leading-7 text-[var(--ink-soft)]">
              This link stays active until {formatDate(tokenState.expiresAt, "MMM d, yyyy HH:mm")}. Once the password changes, every older reset link and active session will be revoked.
            </div>
          </>
        ) : null}

        {tokenState.status === "missing" ? (
          <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
            The password reset link is incomplete. Request a fresh link to continue.
          </div>
        ) : null}

        {tokenState.status === "invalid" ? (
          <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
            This password reset link is invalid or has already been used.
          </div>
        ) : null}

        {tokenState.status === "expired" ? (
          <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
            This password reset link expired at {formatDate(tokenState.expiresAt, "MMM d, yyyy HH:mm")}. Request a fresh one to continue.
          </div>
        ) : null}
      </section>

      <div className="space-y-4">
        {tokenState.status === "valid" ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="rounded-[2rem] border border-black/8 bg-white/84 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              Request a new password reset email and open the latest link from your inbox.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/forgot-password" className="btn-primary">
                Request a new link
              </Link>
              <Link href="/login" className="btn-secondary">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
