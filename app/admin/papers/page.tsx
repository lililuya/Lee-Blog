import Link from "next/link";
import { Plus, RefreshCcw, SquarePen } from "lucide-react";
import { getAdminPaperLibraryOverview } from "@/lib/paper-library-queries";
import { getAdminPaperTopics, getRecentPaperEntries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { syncAllPaperTopicsAction } from "@/lib/actions/paper-actions";

export const dynamic = "force-dynamic";

export default async function AdminPapersPage() {
  const [topics, recentEntries, libraryOverview] = await Promise.all([
    getAdminPaperTopics(),
    getRecentPaperEntries(12),
    getAdminPaperLibraryOverview(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="section-kicker">Daily Papers</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Paper Feed Management</h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            Manage arXiv topic sync, monitor newly ingested papers, and see how the paper feed is turning into a personal research workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={syncAllPaperTopicsAction}>
            <button type="submit" className="btn-secondary">
              <RefreshCcw className="h-4 w-4" />
              Sync All Topics
            </button>
          </form>
          <Link href="/admin/papers/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New Paper Topic
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Saved Papers</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.savedItems}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Reading</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.readingItems}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Completed</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.completedItems}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Annotations</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.annotations}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">Topic</th>
              <th className="px-6 py-4 font-semibold">Query</th>
              <th className="px-6 py-4 font-semibold">Daily Limit</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.id} className="border-t border-black/6 align-top">
                <td className="px-6 py-4">
                  <div className="font-semibold text-[var(--ink)]">{topic.name}</div>
                  <div className="text-xs text-[var(--ink-soft)]">/{topic.slug}</div>
                  {topic.description ? (
                    <p className="mt-2 max-w-sm text-xs leading-6 text-[var(--ink-soft)]">{topic.description}</p>
                  ) : null}
                </td>
                <td className="max-w-md px-6 py-4 text-[var(--ink-soft)]">{topic.query}</td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{topic.maxResults}</td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{topic.enabled ? "Enabled" : "Disabled"}</td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/papers/${topic.id}`}
                    className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
                  >
                    <SquarePen className="h-4 w-4" />
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl font-semibold tracking-tight">Recently Synced Papers</h2>
        <div className="grid gap-4">
          {recentEntries.map((entry) => (
            <article key={entry.id} className="rounded-[1.8rem] border border-black/8 bg-white/78 p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                <span className="badge-soft">{entry.topic.name}</span>
                <span>{formatDate(entry.digestDate, "yyyy-MM-dd")}</span>
                {entry.primaryCategory ? <span>{entry.primaryCategory}</span> : null}
              </div>
              <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">{entry.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{entry.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}