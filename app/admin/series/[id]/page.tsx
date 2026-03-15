import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { SeriesForm } from "@/components/forms/series-form";
import {
  deleteContentSeriesAction,
  updateContentSeriesAction,
} from "@/lib/actions/series-actions";
import { getAdminContentSeriesById } from "@/lib/queries";
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
          <p className="section-kicker">Series</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Edit series</h1>
        </div>
        <form action={deleteContentSeriesAction}>
          <input type="hidden" name="seriesId" value={series.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            <Trash2 className="h-4 w-4" />
            Delete series
          </button>
        </form>
      </div>

      {resolvedSearchParams.saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Series saved.
        </div>
      ) : null}

      <SeriesForm action={updateContentSeriesAction} submitLabel="Save changes" series={series} />

      <section className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className="space-y-2">
          <p className="section-kicker">Linked content</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Current series members</h2>
          <p className="text-sm leading-7 text-[var(--ink-soft)]">
            Attach content from the post, note, and digest editors. Items are shown here in the stored series order.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">Posts</h3>
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
                    Order {post.seriesOrder ?? "N/A"} · {post.status}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {post.publishedAt ? formatDate(post.publishedAt, "yyyy-MM-dd HH:mm") : "Not published"}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-5 text-sm text-[var(--ink-soft)]">
                No posts linked yet.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">Notes</h3>
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
                    Order {note.seriesOrder ?? "N/A"} · {note.status}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {note.publishedAt ? formatDate(note.publishedAt, "yyyy-MM-dd HH:mm") : "Not published"}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-5 text-sm text-[var(--ink-soft)]">
                No notes linked yet.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">Digests</h3>
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
                    Order {digest.seriesOrder ?? "N/A"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {formatDate(digest.publishedAt, "yyyy-MM-dd HH:mm")}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-5 text-sm text-[var(--ink-soft)]">
                No digests linked yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
