import Link from "next/link";
import { LockKeyhole, Settings2 } from "lucide-react";
import { AuthForm } from "@/components/forms/auth-form";
import { isDatabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/admin";

  return (
    <div className="container-shell grid min-h-[calc(100vh-9rem)] gap-8 py-16 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
      <section className="space-y-6">
        <p className="section-kicker">Login</p>
        <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
          Sign in to manage the site.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          This login is reserved for the site administrator. Readers can browse normally and leave
          guest comments without creating an account.
        </p>
        {params.error === "registration-closed" ? (
          <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
            Public registration is closed. The site now uses guest comments instead of reader
            accounts.
          </div>
        ) : null}
        {params.error === "verify-email" ? (
          <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
            Please verify your email before signing in. If needed, submit the form once and use the resend action shown below.
          </div>
        ) : null}
        {params.error === "two-factor-required" ? (
          <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            This account requires two-factor authentication. Please sign in from the standard login form so the authenticator code step can be completed.
          </div>
        ) : null}
        {!isDatabaseConfigured() ? (
          <div className="rounded-[1.6rem] border border-dashed border-[rgba(168,123,53,0.4)] bg-[rgba(168,123,53,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            The database is not configured yet. Public pages can still show demo content, but sign-in and admin features require a valid `DATABASE_URL`.
          </div>
        ) : null}
        <div className="rounded-[1.6rem] border border-black/8 bg-white/75 p-5 text-sm leading-7 text-[var(--ink-soft)]">
          <p className="font-semibold text-[var(--ink)]">Before signing in, confirm these two things:</p>
          <p className="mt-2">1. You already ran `npm run db:seed`, otherwise the admin and reader accounts will not exist.</p>
          <p>2. Site login credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, not from the PostgreSQL database password.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="outline-card rounded-[1.6rem] p-5">
            <LockKeyhole className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">Secure Sign-in</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              The admin system uses database-backed sessions and HttpOnly cookies, which is a practical fit for a self-managed blog.
            </p>
          </div>
          <div className="outline-card rounded-[1.6rem] p-5">
            <Settings2 className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">Full Control</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              You control the frontend, backend, permissions, provider setup, and deployment flow without relying on a separate CMS.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <AuthForm mode="login" nextPath={nextPath} />
        <p className="text-sm text-[var(--ink-soft)]">
          Forgot the admin password?
          <Link href="/forgot-password" className="ml-2 font-semibold text-[var(--accent-strong)]">
            Reset it here
          </Link>
        </p>
      </div>
    </div>
  );
}
