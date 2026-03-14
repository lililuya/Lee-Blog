"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  Bookmark,
  FileSearch,
  NotebookPen,
  PenSquare,
  ScrollText,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HeaderNavProps = {
  isSignedIn: boolean;
};

const baseItems = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/blog", label: "Blog", icon: BookOpenText },
  { href: "/journal", label: "Journal", icon: PenSquare },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/papers", label: "Papers", icon: FileSearch },
  { href: "/digest", label: "Digest", icon: ScrollText },
  { href: "/search", label: "Search", icon: Search },
  { href: "/tools", label: "Tools", icon: Wrench },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  if (href === "/papers") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ isSignedIn }: HeaderNavProps) {
  const pathname = usePathname();
  const items = isSignedIn
    ? [...baseItems.slice(0, 5), { href: "/papers/library", label: "My Library", icon: Bookmark }, ...baseItems.slice(5)]
    : [...baseItems];

  return (
    <nav className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
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
    </nav>
  );
}
