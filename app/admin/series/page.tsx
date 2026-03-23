import Link from "next/link";
import { BookMarked, Layers3, Plus, Star } from "lucide-react";
import { getAdminContentSeries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const [seriesList, params] = await Promise.all([getAdminContentSeries(), searchParams]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">专题</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">内容专题</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            把文章、笔记和每周摘要整理成连续的阅读路径，让读者能沿着同一主题持续追踪内容。
          </p>
        </div>
        <Link href="/admin/series/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          新建专题
        </Link>
      </div>

      {params.deleted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          专题已删除，原先关联的内容现在会被视为独立条目。
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {seriesList.map((series) => (
          <Link
            key={series.id}
            href={`/admin/series/${series.id}`}
            className="glass-card rounded-[2rem] p-6 transition hover:-translate-y-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <Layers3 className="h-4 w-4" />
                  专题
                </div>
                <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{series.title}</h2>
              </div>
              {series.featured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(168,123,53,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                  <Star className="h-3.5 w-3.5" />
                  精选
                </span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{series.summary}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">文章</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{series._count.posts}</p>
              </div>
              <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">笔记</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{series._count.notes}</p>
              </div>
              <div className="rounded-[1.2rem] border border-black/8 bg-white/62 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">摘要</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{series._count.weeklyDigests}</p>
              </div>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              <BookMarked className="h-4 w-4" />
              打开专题
            </div>
          </Link>
        ))}
      </div>

      {seriesList.length === 0 ? (
        <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
          还没有专题。先创建一个专题，然后再从文章、笔记和摘要编辑器里把内容挂进去。
        </div>
      ) : null}
    </div>
  );
}
