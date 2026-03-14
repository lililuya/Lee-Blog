import Link from "next/link";
import { AuthForm } from "@/components/forms/auth-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="container-shell grid min-h-[calc(100vh-9rem)] gap-8 py-16 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
      <section className="space-y-6">
        <p className="section-kicker">Register</p>
        <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
          Create a reader account to join discussions.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Readers can register and comment on posts. Reader comments go into a moderation queue first, so the admin can keep discussions constructive.
        </p>
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