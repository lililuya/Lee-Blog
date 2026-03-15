import Link from "next/link";
import { Eye, RefreshCcw, Trash2 } from "lucide-react";
import {
  deleteWeeklyDigestAction,
  generateWeeklyDigestAction,
  updateWeeklyDigestSeriesAction,
} from "@/lib/actions/digest-actions";
import { getAdminSeriesOptions, getAdminWeeklyDigests } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDigestsPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; deleted?: string; updated?: string }>;
}) {
  const [digests, seriesOptions, params] = await Promise.all([
    getAdminWeeklyDigests(),
    getAdminSeriesOptions(),
    searchParams,
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Weekly Digest</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Weekly digests</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            Turn one week of papers, journals, and published posts into a public digest, then optionally attach it to a long-running series.
          </p>
        </div>
        <form action={generateWeeklyDigestAction}>
          <button type="submit" className="btn-primary">
            <RefreshCcw className="h-4 w-4" />
            Generate this week&apos;s digest
          </button>
        </form>
      </div>

      {params.generated || params.deleted || params.updated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {params.generated
            ? "Weekly digest generated."
            : params.updated
              ? "Digest series settings updated."
              : "Weekly digest deleted."}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">Title</th>
              <th className="px-6 py-4 font-semibold">Period</th>
              <th className="px-6 py-4 font-semibold">Stats</th>
              <th className="px-6 py-4 font-semibold">Series</th>
              <th className="px-6 py-4 font-semibold">Published</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {digests.map((digest) => (
              <tr key={digest.id} className="border-t border-black/6 align-top">
                <td className="px-6 py-4">
                  <div className="font-semibold text-[var(--ink)]">{digest.title}</div>
                  <div className="mt-2 max-w-md text-xs leading-6 text-[var(--ink-soft)]">{digest.summary}</div>
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  {formatDate(digest.periodStart, "yyyy-MM-dd")}
                  <br />
                  {formatDate(digest.periodEnd, "yyyy-MM-dd")}
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  Papers {digest.paperCount} / Journal {digest.journalCount} / Posts {digest.postCount}
                </td>
                <td className="px-6 py-4">
                  <form action={updateWeeklyDigestSeriesAction} className="space-y-3">
                    <input type="hidden" name="digestId" value={digest.id} />
                    <select name="seriesId" defaultValue={digest.seriesId ?? ""} className="field min-w-56">
                      <option value="">Standalone digest</option>
                      {seriesOptions.map((series) => (
                        <option key={series.id} value={series.id}>
                          {series.title}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-3">
                      <input
                        name="seriesOrder"
                        type="number"
                        min={1}
                        max={999}
                        defaultValue={digest.seriesOrder ?? ""}
                        className="field w-24"
                        placeholder="1"
                      />
                      <button type="submit" className="btn-secondary">
                        Save
                      </button>
                    </div>
                    {digest.series ? (
                      <div className="text-xs leading-6 text-[var(--ink-soft)]">
                        Current: {digest.series.title}
                      </div>
                    ) : null}
                  </form>
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">
                  {formatDate(digest.publishedAt, "yyyy-MM-dd HH:mm")}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/digest/${digest.slug}`} className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]">
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <form action={deleteWeeklyDigestAction}>
                      <input type="hidden" name="digestId" value={digest.id} />
                      <button type="submit" className="inline-flex items-center gap-2 font-semibold text-rose-700">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
