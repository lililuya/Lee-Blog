"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  ArrowUp,
  Bell,
  BookOpenText,
  Bookmark,
  FileSearch,
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
  count?: number;
};

const baseItems = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/blog", label: "Blog", icon: BookOpenText },
  { href: "/series", label: "Series", icon: Layers3 },
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

function formatUnreadCount(count: number) {
  if (count > 99) {
    return "99+";
  }

  return String(count);
}

export function HeaderNav({
  isSignedIn,
  isAdmin,
  unreadNotificationCount = 0,
  mode = "all",
}: HeaderNavProps) {
  const pathname = usePathname();
  const items: NavItem[] = isSignedIn
    ? [
        ...baseItems.slice(0, 6),
        { href: "/papers/library", label: "My Library", icon: Bookmark },
        ...baseItems.slice(6),
        ...(isAdmin ? adminItems : []),
      ]
    : [...baseItems, ...(isAdmin ? adminItems : [])];
  const notificationCount = unreadNotificationCount > 0 ? unreadNotificationCount : undefined;
  const mobileItems = isSignedIn
    ? [
        ...items,
        {
          href: "/account/notifications",
          label: "Inbox",
          icon: Bell,
          count: notificationCount,
        },
      ]
    : items;

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {mode !== "mobile" ? (
        <div className="site-side-rail hidden min-[1400px]:flex">
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
                >
                  <span className="site-side-rail__icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="site-side-rail__label">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="site-side-rail__tools" role="group" aria-label="Quick actions">
            {isSignedIn ? (
              <Link
                href="/account/notifications"
                className={cn(
                  "site-side-rail__tool",
                  isActive(pathname, "/account/notifications") && "site-side-rail__tool--active",
                )}
                aria-label={
                  unreadNotificationCount > 0
                    ? `Inbox, ${unreadNotificationCount} unread notifications`
                    : "Inbox"
                }
                title="Inbox"
              >
                <span className="site-side-rail__tool-icon" aria-hidden="true">
                  <Bell className="h-4 w-4" />
                </span>
                {notificationCount ? (
                  <span className="site-side-rail__count" aria-hidden="true">
                    {formatUnreadCount(notificationCount)}
                  </span>
                ) : null}
                <span className="site-side-rail__tool-label">Inbox</span>
              </Link>
            ) : null}
            {isAdmin ? (
              <Link
                href="/admin"
                className="site-side-rail__tool"
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
            <button
              type="button"
              className="site-side-rail__tool"
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
          {mobileItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const count =
              href === "/account/notifications" && notificationCount
                ? formatUnreadCount(notificationCount)
                : null;

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
                {count ? <span className="site-nav-chip__count">{count}</span> : null}
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
