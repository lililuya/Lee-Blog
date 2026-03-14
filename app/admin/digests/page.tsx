import Link from "next/link";
import { Eye, RefreshCcw, Trash2 } from "lucide-react";
import {
  deleteWeeklyDigestAction,
  generateWeeklyDigestAction,
} from "@/lib/actions/digest-actions";
import { getAdminWeeklyDigests } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDigestsPage() {
  const digests = await getAdminWeeklyDigests();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Weekly Digest</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">每周研究简报</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            这里会把一周内的论文、日志和文章自动汇总成一份可以公开展示的研究周报。默认建议每周一早上生成一次。
          </p>
        </div>
        <form action={generateWeeklyDigestAction}>
          <button type="submit" className="btn-primary">
            <RefreshCcw className="h-4 w-4" />
            生成本周简报
          </button>
        </form>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">标题</th>
              <th className="px-6 py-4 font-semibold">周期</th>
              <th className="px-6 py-4 font-semibold">统计</th>
              <th className="px-6 py-4 font-semibold">发布时间</th>
              <th className="px-6 py-4 font-semibold">操作</th>
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
                  论文 {digest.paperCount} / 日志 {digest.journalCount} / 文章 {digest.postCount}
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{formatDate(digest.publishedAt, "yyyy-MM-dd HH:mm")}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/digest/${digest.slug}`} className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]">
                      <Eye className="h-4 w-4" />
                      查看
                    </Link>
                    <form action={deleteWeeklyDigestAction}>
                      <input type="hidden" name="digestId" value={digest.id} />
                      <button type="submit" className="inline-flex items-center gap-2 font-semibold text-rose-700">
                        <Trash2 className="h-4 w-4" />
                        删除
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