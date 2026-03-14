import Link from "next/link";
import { CalendarRange, FileStack, ScrollText } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { getWeeklyDigests } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const digests = await getWeeklyDigests(18);

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Weekly Digest"
          title="每周研究简报"
          description="把站内一周的论文同步、日志记录和正式文章整理成一份公开可回看的研究周报，方便你自己复盘，也方便访客快速理解最近的工作重点。"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              已生成周报
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{digests.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              每份周报都会归档为独立详情页，方便长期回看。
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              信息来源
            </p>
            <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">
              论文 + 日志 + 文章
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              把输入、过程和输出放到同一份摘要里，更利于运营与知识沉淀。
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              推荐节奏
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">周一 08:00</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              推荐在 Asia/Shanghai 时区每周一早上生成上一周的研究简报。
            </p>
          </div>
        </div>

        {digests.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {digests.map((digest) => (
              <article key={digest.id} className="glass-card rounded-[2rem] p-6">
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                  <span className="badge-soft">Weekly Digest</span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarRange className="h-4 w-4" />
                    {formatDate(digest.periodStart, "yyyy-MM-dd")} - {formatDate(digest.periodEnd, "yyyy-MM-dd")}
                  </span>
                </div>
                <h2 className="mt-5 font-serif text-3xl font-semibold tracking-tight">
                  {digest.title}
                </h2>
                <p className="mt-4 text-sm leading-8 text-[var(--ink-soft)]">{digest.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {digest.highlights.slice(0, 3).map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-black/8 bg-white/70 px-3 py-2 text-xs text-[var(--ink-soft)]"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
                  <span className="inline-flex items-center gap-2">
                    <FileStack className="h-4 w-4" />
                    论文 {digest.paperCount} 篇
                  </span>
                  <span>日志 {digest.journalCount} 条</span>
                  <span>文章 {digest.postCount} 篇</span>
                </div>
                <Link href={`/digest/${digest.slug}`} className="btn-secondary mt-6">
                  <ScrollText className="h-4 w-4" />
                  阅读完整周报
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            目前还没有生成任何周报。你可以先在后台的“每周简报”模块手动生成一份，或者配置每周一 08:00 的自动任务。
          </div>
        )}
      </div>
    </div>
  );
}