import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { SeriesForm } from "@/components/forms/series-form";
import {
  deleteContentSeriesAction,
  updateContentSeriesAction,
} from "@/lib/actions/series-actions";
import { getAdminContentSeriesById } from "@/lib/queries";
import { formatPostStatusLabel } from "@/lib/ui-labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditSeriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const [series, resolvedSearchParams] = await Promise.all([
    getAdminContentSeriesById(id),
    searchParams,
  ]);

  if (!series) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">专题</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑专题</h1>
        </div>
        <form
          action={deleteContentSeriesAction}
          data-confirm-message="确认删除这个专题吗？关联的文章、笔记和摘要会变成独立条目。"
        >
          <input type="hidden" name="seriesId" value={series.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            <Trash2 className="h-4 w-4" />
            删除专题
          </button>
        </form>
      </div>

      {resolvedSearchParams.saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          专题已保存。
        </div>
      ) : null}

      <SeriesForm
        action={updateContentSeriesAction}
        submitLabel="保存更改"
        confirmMessage="确认保存这个专题的更改吗？关联内容会立即使用更新后的专题信息。"
        series={series}
      />

      <section className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className="space-y-2">
          <p className="section-kicker">关联内容</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight">当前专题成员</h2>
          <p className="text-sm leading-7 text-[var(--ink-soft)]">
            可以从文章、笔记和摘要编辑器中挂载内容。这里会按照当前保存的专题顺序展示。
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">文章</h3>
            {series.posts.length ? (
              series.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/admin/posts/${post.id}`}
                  className="block rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--ink)]">{post.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--accent-strong)]" />
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    顺序 {post.seriesOrder ?? "未设置"} · {formatPostStatusLabel(post.status)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {post.publishedAt ? formatDate(post.publishedAt, "yyyy-MM-dd HH:mm") : "未发布"}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-5 text-sm text-[var(--ink-soft)]">
                还没有关联文章。
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">笔记</h3>
            {series.notes.length ? (
              series.notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/admin/notes/${note.id}`}
                  className="block rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--ink)]">{note.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--accent-strong)]" />
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    顺序 {note.seriesOrder ?? "未设置"} · {formatPostStatusLabel(note.status)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {note.publishedAt ? formatDate(note.publishedAt, "yyyy-MM-dd HH:mm") : "未发布"}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-5 text-sm text-[var(--ink-soft)]">
                还没有关联笔记。
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">摘要</h3>
            {series.weeklyDigests.length ? (
              series.weeklyDigests.map((digest) => (
                <Link
                  key={digest.id}
                  href="/admin/digests"
                  className="block rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--ink)]">{digest.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--accent-strong)]" />
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    顺序 {digest.seriesOrder ?? "未设置"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {formatDate(digest.publishedAt, "yyyy-MM-dd HH:mm")}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-5 text-sm text-[var(--ink-soft)]">
                还没有关联摘要。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
