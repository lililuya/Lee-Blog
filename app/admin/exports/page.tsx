import Link from "next/link";
import { Download, FileArchive, FileJson } from "lucide-react";

export const dynamic = "force-dynamic";

const exportItems = [
  {
    kind: "full",
    title: "Full backup",
    description: "Series, posts, notes, digests, comments, users, and paper library in one JSON export.",
  },
  {
    kind: "posts",
    title: "Posts export",
    description: "Long-form articles with author and series metadata.",
  },
  {
    kind: "comments",
    title: "Comments export",
    description: "All comments, moderation state, author info, and linked post metadata.",
  },
  {
    kind: "users",
    title: "Users export",
    description: "Account-level data excluding password hashes and 2FA secrets.",
  },
  {
    kind: "paper-library",
    title: "Paper library export",
    description: "Saved papers and annotations across all users.",
  },
];

export default function AdminExportsPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="section-kicker">Exports</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          Data export and backup
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          Download JSON backups for migration, offline auditing, or disaster recovery. Sensitive authentication secrets are excluded.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {exportItems.map((item) => (
          <article key={item.kind} className="glass-card rounded-[2rem] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <FileArchive className="h-4 w-4" />
                  Export
                </div>
                <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{item.title}</h2>
              </div>
              <FileJson className="h-5 w-5 text-[var(--ink-soft)]" />
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{item.description}</p>
            <Link href={`/api/admin/export?kind=${encodeURIComponent(item.kind)}`} className="btn-secondary mt-6">
              <Download className="h-4 w-4" />
              Download JSON
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
