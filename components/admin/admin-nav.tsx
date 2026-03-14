import Link from "next/link";
import {
  FileSearch,
  History,
  LayoutDashboard,
  Library,
  MessageCircleReply,
  NotebookPen,
  PenSquare,
  ScrollText,
  ShieldUser,
  UserRoundCog,
  Wrench,
} from "lucide-react";

const adminItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Posts", icon: Library },
  { href: "/admin/journal", label: "Journal", icon: PenSquare },
  { href: "/admin/notes", label: "Notes", icon: NotebookPen },
  { href: "/admin/papers", label: "Daily Papers", icon: FileSearch },
  { href: "/admin/digests", label: "Weekly Digests", icon: ScrollText },
  { href: "/admin/comments", label: "Comments", icon: MessageCircleReply },
  { href: "/admin/users", label: "Users", icon: ShieldUser },
  { href: "/admin/audit", label: "Audit Logs", icon: History },
  { href: "/admin/profile", label: "Profile", icon: UserRoundCog },
  { href: "/admin/providers", label: "LLM Providers", icon: Wrench },
];

export function AdminNav() {
  return (
    <aside className="glass-card h-fit rounded-[2rem] p-4">
      <div className="mb-4 border-b border-black/6 px-3 pb-4">
        <p className="section-kicker">Admin</p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Content & System</h2>
      </div>
      <nav className="space-y-2">
        {adminItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-white/80 hover:text-[var(--ink)]"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
