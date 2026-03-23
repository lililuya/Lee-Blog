import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getRecentJournalEntries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "研究日志",
  description: "按时间记录实验、实现笔记与过程判断的公开研究日志。",
  path: "/journal",
  keywords: ["日志", "研究日志", "工作笔记", "项目记录"],
  section: "日志",
  type: "website",
  ogEyebrow: "日志",
});

export default async function JournalPage() {
  const entries = await getRecentJournalEntries(50);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客日志",
    description: "按时间记录实验、实现笔记与过程观察的研究日志列表。",
    path: "/journal",
    itemCount: entries.length,
    keywords: ["日志", "研究日志", "工作笔记", "项目记录"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "日志列表",
    path: "/journal",
    items: entries.map((entry) => ({
      name: entry.title,
      path: `/journal/${entry.slug}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="日志"
          title="研究日志"
          description="把实验、实现、卡点和阶段性判断按条目沉淀下来。列表页只保留概览，进入详情页再完整阅读。"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>公开页面中共收录 {entries.length} 条日志。</p>
          <p>最新内容排在最前，适合先扫读概览，再按条目进入详细阅读。</p>
        </div>

        {entries.length > 0 ? (
          <div className="editorial-list">
            {entries.map((entry) => (
              <Link
                key={entry.slug}
                href={`/journal/${entry.slug}`}
                className="editorial-list-item group block"
              >
                <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)_8rem] lg:items-start">
                  <div className="space-y-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(entry.publishedAt, "yyyy-MM-dd HH:mm")}
                    </span>
                    <span className="inline-flex rounded-full bg-[rgba(168,123,53,0.1)] px-3 py-1 text-[0.72rem] text-[var(--gold)]">
                      {entry.mood ?? "稳步推进"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h2 className="font-serif text-[clamp(1.25rem,2.2vw,1.72rem)] font-semibold tracking-tight text-[var(--ink)] transition group-hover:text-[var(--accent-strong)]">
                      {entry.title}
                    </h2>
                    <p className="max-w-3xl text-sm leading-8 text-[var(--ink-soft)]">
                      {entry.summary}
                    </p>
                  </div>

                  <div className="flex items-center lg:justify-end">
                    <span className="section-link-pill section-link-pill--compact">
                      继续阅读
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            目前还没有公开日志。你可以先在后台发布一条内容，这里就会自动形成列表。
          </div>
        )}
      </div>
    </div>
  );
}
