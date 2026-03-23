import Link from "next/link";
import {
  BarChart3,
  Database,
  Download,
  FileSearch,
  FolderTree,
  History,
  Images,
  Layers3,
  LayoutDashboard,
  Library,
  Mail,
  MessageCircleReply,
  NotebookPen,
  PenSquare,
  ScrollText,
  ShieldAlert,
  ShieldUser,
  UserRoundCog,
  Waypoints,
  Wrench,
} from "lucide-react";

const adminItems = [
  { href: "/admin", label: "总览", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/admin/rag", label: "RAG 控制台", icon: Database },
  { href: "/admin/subscriptions", label: "订阅", icon: Mail },
  { href: "/admin/categories", label: "分类", icon: FolderTree },
  { href: "/admin/series", label: "专题", icon: Layers3 },
  { href: "/admin/gallery", label: "图集", icon: Images },
  { href: "/admin/posts", label: "文章", icon: Library },
  { href: "/admin/journal", label: "日志", icon: PenSquare },
  { href: "/admin/notes", label: "笔记", icon: NotebookPen },
  { href: "/admin/papers", label: "每日论文", icon: FileSearch },
  { href: "/admin/digests", label: "每周周报", icon: ScrollText },
  { href: "/admin/comments", label: "评论", icon: MessageCircleReply },
  { href: "/admin/comments/rules", label: "评论规则", icon: ShieldAlert },
  { href: "/admin/users", label: "用户", icon: ShieldUser },
  { href: "/admin/audit", label: "审计日志", icon: History },
  { href: "/admin/exports", label: "导出", icon: Download },
  { href: "/admin/profile", label: "站点资料", icon: UserRoundCog },
  { href: "/admin/request-debug", label: "连通性与响应调试", icon: Waypoints },
  { href: "/admin/providers", label: "LLM 提供方", icon: Wrench },
];

export function AdminNav() {
  return (
    <aside className="glass-card h-fit rounded-[2rem] p-4">
      <div className="mb-4 border-b border-[color:var(--border)] px-3 pb-4">
        <p className="section-kicker">后台</p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
          内容与系统
        </h2>
      </div>
      <nav className="space-y-2">
        {adminItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--ink)]"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
