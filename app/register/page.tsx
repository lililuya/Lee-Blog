import Link from "next/link";
import { LockKeyhole, MessageSquareMore } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="container-shell grid min-h-[calc(100vh-9rem)] gap-8 py-16 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
      <section className="space-y-6">
        <p className="section-kicker">Registration Closed</p>
        <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
          This site no longer uses public reader accounts.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          The blog now follows a simpler model: readers browse content freely and can leave guest
          comments without signing up. Only the site administrator can sign in.
        </p>
      </section>

      <div className="space-y-4 rounded-[2rem] border border-black/8 bg-white/84 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.7)] p-5">
          <div className="flex items-start gap-3">
            <MessageSquareMore className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
            <div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Guest comments</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                You can still join the discussion directly under each post with a name and an
                optional email address.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.7)] p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
            <div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Admin access</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                If you are the site owner, use the admin login instead of creating a new account.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Admin login
          </Link>
          <Link href="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
