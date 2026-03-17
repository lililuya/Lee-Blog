import Link from "next/link";
import { LogIn } from "lucide-react";
import { HeaderNav } from "@/components/site/header-nav";
import { ThemeToggle } from "@/components/site/theme-toggle";
import type { CurrentUser } from "@/lib/auth";

type SiteHeaderProps = {
  currentUser: CurrentUser;
  unreadNotificationCount: number;
};

export function SiteHeader({ currentUser, unreadNotificationCount }: SiteHeaderProps) {
  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <>
      <header className="site-header-shell sticky top-0 z-40">
        <div className="container-shell py-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="min-[1400px]:hidden">
              <ThemeToggle />
            </div>

            {!currentUser ? (
              <Link href="/login" className="btn-primary">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            ) : null}
          </div>

          <HeaderNav
            isSignedIn={Boolean(currentUser)}
            isAdmin={isAdmin}
            unreadNotificationCount={unreadNotificationCount}
            mode="mobile"
          />
        </div>
      </header>
      <HeaderNav
        isSignedIn={Boolean(currentUser)}
        isAdmin={isAdmin}
        unreadNotificationCount={unreadNotificationCount}
        mode="desktop"
      />
    </>
  );
}
