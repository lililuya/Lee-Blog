import Link from "next/link";
import { Plus, RefreshCcw, SquarePen } from "lucide-react";
import { getAdminPaperLibraryOverview } from "@/lib/paper-library-queries";
import { getAdminPaperTopics, getRecentPaperEntries } from "@/lib/queries";
import { formatEnabledDisabledLabel } from "@/lib/ui-labels";
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
          <p className="section-kicker">每日论文</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">论文主题管理</h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            在这里管理 arXiv 主题同步、查看刚抓取的论文，并观察论文流如何逐步沉淀成你的个人研究工作台。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <form
            action={syncAllPaperTopicsAction}
            data-confirm-message="现在同步全部论文主题吗？这可能会一次性导入较大批量的新论文。"
          >
            <button type="submit" className="btn-secondary">
              <RefreshCcw className="h-4 w-4" />
              同步全部主题
            </button>
          </form>
          <Link href="/admin/papers/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            新建论文主题
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">已收藏论文</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.savedItems}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">正在阅读</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.readingItems}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">已读完</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.completedItems}</p>
        </div>
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">批注</p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{libraryOverview.annotations}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">主题</th>
              <th className="px-6 py-4 font-semibold">查询</th>
              <th className="px-6 py-4 font-semibold">每日上限</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">操作</th>
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
                <td className="px-6 py-4 text-[var(--ink-soft)]">{formatEnabledDisabledLabel(topic.enabled)}</td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/papers/${topic.id}`}
                    className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
                  >
                    <SquarePen className="h-4 w-4" />
                    编辑
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl font-semibold tracking-tight">最近同步的论文</h2>
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
