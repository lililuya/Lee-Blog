import Link from "next/link";
import { ArrowUpRight, CalendarRange, Layers3 } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { getContentArchive } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const archiveTimeline = await getContentArchive();
  const totalEntries = archiveTimeline.reduce((sum, group) => sum + group.total, 0);

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Archive"
          title="内容归档"
          description="这里把博客、常青笔记、研究周报和日志更新放在同一条时间线上，方便你按月份回看整个站点在不同阶段的输出。"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              归档月份
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">
              {archiveTimeline.length}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              用月份维度整理，浏览起来比按模块分散查看更直观。
            </p>
          </div>

          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              公开条目
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{totalEntries}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              这里会汇总所有面向访客公开展示的内容。
            </p>
          </div>

          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              内容类型
            </p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">4</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              博客、笔记、周报、日志会在这里统一串起来。
            </p>
          </div>
        </div>

        {archiveTimeline.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {archiveTimeline.map((group) => (
              <section
                key={group.key}
                id={group.key}
                className="glass-card rounded-[2rem] p-6 scroll-mt-28"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="section-kicker">Month</p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
                      {group.label}
                    </h2>
                  </div>
                  <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                    {group.total} 条
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {group.entries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={entry.href}
                      className="block rounded-[1.5rem] border border-black/8 bg-[rgba(255,255,255,0.58)] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span className="rounded-full bg-[rgba(168,123,53,0.12)] px-3 py-1 text-[var(--gold)]">
                          {entry.kindLabel}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarRange className="h-3.5 w-3.5" />
                          {formatDate(entry.publishedAt, "yyyy-MM-dd")}
                        </span>
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-4">
                        <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                          {entry.title}
                        </h3>
                        <ArrowUpRight className="mt-1 h-4 w-4 flex-none text-[var(--accent-strong)]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            暂时还没有可公开显示的归档内容。发布文章、笔记或周报后，这里会自动按月份生成时间线。
          </div>
        )}

        <section className="glass-card rounded-[2rem] p-6">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="font-serif text-2xl font-semibold tracking-tight">为什么这样设计</h3>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-[var(--ink-soft)]">
            你的站点不只有博客文章，还有常青笔记、研究周报和日志。如果只做“博客归档”，访客仍然需要跳来跳去。现在这个归档页会把所有公开内容按月份串成一条线，更适合研究型博客的长期沉淀。
          </p>
        </section>
      </div>
    </div>
  );
}
