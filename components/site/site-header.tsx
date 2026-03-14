import Link from "next/link";
import { FlaskConical, LayoutDashboard, LogIn } from "lucide-react";
import { HeaderNav } from "@/components/site/header-nav";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { logoutAction } from "@/lib/actions/auth-actions";
import type { CurrentUser } from "@/lib/auth";

type SiteHeaderProps = {
  currentUser: CurrentUser;
};

export function SiteHeader({ currentUser }: SiteHeaderProps) {
  return (
    <header className="site-header-shell sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="container-shell py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(27,107,99,0.92),_rgba(16,69,63,0.98))] text-white shadow-lg shadow-emerald-950/15">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif text-xl font-semibold tracking-tight">Lee</div>
              <div className="text-sm text-[var(--ink-soft)]">
                Lee&apos;s daily blog
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {currentUser?.role === "ADMIN" ? (
              <Link href="/admin" className="section-link-pill section-link-pill--compact hidden md:inline-flex">
                <LayoutDashboard className="h-4 w-4" />
                Admin Console
              </Link>
            ) : null}

            {currentUser ? (
              <form action={logoutAction}>
                <button className="btn-secondary" type="submit">
                  Sign Out {currentUser.name}
                </button>
              </form>
            ) : (
              <Link href="/login" className="btn-primary">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>

        <HeaderNav isSignedIn={Boolean(currentUser)} />
      </div>
    </header>
  );
}
