import Link from "next/link";
import { AuthForm } from "@/components/forms/auth-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="container-shell grid min-h-[calc(100vh-9rem)] gap-8 py-16 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
      <section className="space-y-6">
        <p className="section-kicker">Register</p>
        <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
          Create a reader account to join discussions.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Readers can register and comment on posts. New accounts must verify their email first, and reader comments still enter moderation so discussions stay constructive.
        </p>
        {params.notice === "verify-email" ? (
          <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-700">
            Account created. Please check your email and open the verification link before signing in.
          </div>
        ) : null}
      </section>

      <div className="space-y-4">
        <AuthForm mode="register" nextPath="/" />
        <p className="text-sm text-[var(--ink-soft)]">
          Already have an account?
          <Link href="/login" className="ml-2 font-semibold text-[var(--accent-strong)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
