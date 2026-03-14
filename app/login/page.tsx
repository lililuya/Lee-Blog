import Link from "next/link";
import { LockKeyhole, Settings2 } from "lucide-react";
import { AuthForm } from "@/components/forms/auth-form";
import { isDatabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
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
          After signing in, you can manage the profile page, publish posts and journal entries, moderate comments, configure LLM providers, and manage reader accounts.
        </p>
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
          No account yet?
          <Link href="/register" className="ml-2 font-semibold text-[var(--accent-strong)]">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}