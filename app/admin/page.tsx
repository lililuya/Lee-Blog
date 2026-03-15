import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Database,
  Download,
  FileSearch,
  History,
  Layers3,
  MessageCircleReply,
  NotebookPen,
  PenSquare,
  ScrollText,
  ShieldAlert,
  ShieldUser,
  Sparkles,
  Wrench,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { getDashboardOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

const quickLinks = [
  {
    href: "/admin/analytics",
    title: "Analytics",
    description: "Track page views, top content, archive usage, search terms, and discussion conversion.",
    icon: BarChart3,
  },
  {
    href: "/admin/rag",
    title: "RAG Console",
    description: "Inspect chunk coverage, embedding readiness, and semantic retrieval previews before users hit the chat layer.",
    icon: Database,
  },
  {
    href: "/admin/series",
    title: "Content Series",
    description: "Curate posts, notes, and digests into guided专题合集 and reading sequences.",
    icon: Layers3,
  },
  {
    href: "/admin/posts",
    title: "Manage Posts",
    description: "Create, edit, and publish long-form writing while maintaining homepage featured content.",
    icon: Sparkles,
  },
  {
    href: "/admin/journal",
    title: "Manage Journal",
    description: "Keep shorter, more frequent work notes and project updates in one place.",
    icon: PenSquare,
  },
  {
    href: "/admin/notes",
    title: "Manage Notes",
    description: "Maintain evergreen knowledge cards, reusable checklists, reading notes, and reference snippets.",
    icon: NotebookPen,
  },
  {
    href: "/admin/papers",
    title: "Daily Papers",
    description: "Sync fresh arXiv papers by topic and turn them into a daily research input stream.",
    icon: FileSearch,
  },
  {
    href: "/admin/digests",
    title: "Weekly Digests",
    description: "Turn a week of papers, journal entries, notes, and blog posts into a public-facing digest.",
    icon: ScrollText,
  },
  {
    href: "/admin/comments",
    title: "Moderate Comments",
    description: "Review pending comments so site discussions stay useful and high quality.",
    icon: MessageCircleReply,
  },
  {
    href: "/admin/comments/rules",
    title: "Comment Rules",
    description: "Maintain custom allow rules, review rules, and hard reject keywords without editing code.",
    icon: ShieldAlert,
  },
  {
    href: "/admin/users",
    title: "User Management",
    description: "Control user roles, comment mute states, login suspension, soft deletion, and session revocation.",
    icon: ShieldUser,
  },
  {
    href: "/admin/audit",
    title: "Audit Trail",
    description: "Review privileged admin operations, including user moderation and comment moderation events.",
    icon: History,
  },
  {
    href: "/admin/exports",
    title: "Exports",
    description: "Download JSON backups for migration, audits, and disaster recovery.",
    icon: Download,
  },
  {
    href: "/admin/providers",
    title: "LLM Providers",
    description: "Manage the model providers used by the floating chat entry in the site corner.",
    icon: Wrench,
  },
];

export default async function AdminDashboardPage() {
  const stats = await getDashboardOverview();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="section-kicker">Dashboard</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          Admin Overview
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          This workspace now covers publishing, note curation, paper sync, weekly digests, comment moderation, exports, analytics, and curated reading series.
        </p>
      </section>

      <section className="data-grid">
        <StatCard label="All Posts" value={stats.posts} hint="Includes drafts, published posts, and archived posts." />
        <StatCard label="Published Posts" value={stats.publishedPosts} hint="Shown on the public blog and homepage feature slots." />
        <StatCard label="All Notes" value={stats.notes} hint="Evergreen notes across draft, published, and archived states." />
        <StatCard label="Published Notes" value={stats.publishedNotes} hint="Shown on the public notes index and included in search/feed output." />
        <StatCard label="Journal Entries" value={stats.journalEntries} hint="Used for ongoing research notes and progress updates." />
        <StatCard label="Paper Topics" value={stats.paperTopics} hint="Currently enabled arXiv tracking topics." />
        <StatCard label="Series" value={stats.series} hint="Curated reading tracks that can connect posts, notes, and digests." />
        <StatCard label="Today's Papers" value={stats.todayPapers} hint="Synced today using the Asia/Shanghai digest boundary." />
        <StatCard label="Weekly Digests" value={stats.weeklyDigests} hint="Public weekly digest entries already generated." />
        <StatCard label="Users" value={stats.users} hint="Excludes deleted accounts." />
        <StatCard label="Muted Users" value={stats.mutedUsers} hint="Accounts currently blocked from posting comments." />
        <StatCard label="Suspended Users" value={stats.suspendedUsers} hint="Accounts currently blocked from signing in." />
        <StatCard label="Pending Comments" value={stats.pendingComments} hint="Reader comments waiting for moderation." />
        <StatCard label="Audit Logs" value={stats.auditLogs} hint="Privileged admin operations recorded for review and traceability." />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {quickLinks.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="glass-card group rounded-[2rem] p-6 transition hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{description}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              Open module
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
