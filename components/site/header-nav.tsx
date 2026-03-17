"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  ArrowUp,
  BookOpenText,
  FileSearch,
  Images,
  LayoutDashboard,
  Layers3,
  LogOut,
  NotebookPen,
  PenSquare,
  ScrollText,
  Search,
  Sparkles,
  type LucideIcon,
  Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { logoutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

type HeaderNavProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  unreadNotificationCount?: number;
  mode?: "desktop" | "mobile" | "all";
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const baseItems = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/blog", label: "Blog", icon: BookOpenText },
  { href: "/series", label: "Series", icon: Layers3 },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/journal", label: "Journal", icon: PenSquare },
  { href: "/papers", label: "Papers", icon: FileSearch },
  { href: "/digest", label: "Digest", icon: ScrollText },
  { href: "/search", label: "Search", icon: Search },
] as const;

const adminItems = [{ href: "/tools", label: "Tools", icon: Wrench }] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  if (href === "/papers") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({
  isSignedIn,
  isAdmin,
  mode = "all",
}: HeaderNavProps) {
  const pathname = usePathname();
  const items: NavItem[] = [...baseItems, ...(isAdmin ? adminItems : [])];

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {mode !== "mobile" ? (
        <div className="site-side-rail hidden min-[1400px]:flex">
          <div className="site-side-rail__scroll-shell">
            <nav className="site-side-rail__nav" aria-label="Primary">
              {items.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn("site-side-rail__item", active && "site-side-rail__item--active")}
                    aria-current={active ? "page" : undefined}
                    aria-label={label}
                    title={label}
                  >
                    <span className="site-side-rail__icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="site-side-rail__label">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="site-side-rail__utility-dock">
            <div className="site-side-rail__tools" role="group" aria-label="Quick actions">
              {isAdmin ? (
                <Link
                  href="/admin"
                  className={cn("site-side-rail__tool", isActive(pathname, "/admin") && "site-side-rail__tool--active")}
                  aria-label="Admin Console"
                  title="Admin Console"
                >
                  <span className="site-side-rail__tool-icon" aria-hidden="true">
                    <LayoutDashboard className="h-4 w-4" />
                  </span>
                  <span className="site-side-rail__tool-label">Admin Console</span>
                </Link>
              ) : null}
              {isSignedIn ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="site-side-rail__tool"
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <span className="site-side-rail__tool-icon" aria-hidden="true">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <span className="site-side-rail__tool-label">Sign Out</span>
                  </button>
                </form>
              ) : null}
              <ThemeToggle variant="rail" />
            </div>

            <button
              type="button"
              className="site-side-rail__backtop"
              onClick={scrollToTop}
              aria-label="Scroll to top"
              title="Scroll to top"
            >
              <span className="site-side-rail__tool-icon" aria-hidden="true">
                <ArrowUp className="h-4 w-4" />
              </span>
              <span className="site-side-rail__tool-label">Top</span>
            </button>
          </div>
        </div>
      ) : null}

      {mode !== "desktop" ? (
        <nav className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 min-[1400px]:hidden">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={cn("site-nav-chip", active && "site-nav-chip--active")}
                aria-current={active ? "page" : undefined}
              >
                <span className="site-nav-chip__icon">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </Link>
            );
          })}

          {isSignedIn ? (
            <form action={logoutAction}>
              <button type="submit" className="site-nav-chip" aria-label="Sign out">
                <span className="site-nav-chip__icon">
                  <LogOut className="h-4 w-4" />
                </span>
                Sign Out
              </button>
            </form>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
