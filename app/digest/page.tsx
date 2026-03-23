import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getWeeklyDigests } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "每周研究周报",
  description:
    "把论文、日志和站内写作整合起来的每周公开研究周报。",
  path: "/digest",
  keywords: ["每周周报", "研究周报", "论文", "每周笔记"],
  section: "周报",
  type: "website",
  ogEyebrow: "周报",
});

export default async function DigestPage() {
  const digests = await getWeeklyDigests(18);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客每周周报",
    description:
      "把论文、笔记和文章整合在一起的每周研究周报归档。",
    path: "/digest",
    itemCount: digests.length,
    keywords: ["每周周报", "研究周报", "论文", "每周笔记"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "每周周报列表",
    path: "/digest",
    items: digests.map((digest) => ({
      name: digest.title,
      path: `/digest/${digest.slug}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="每周周报"
          title="每周研究回顾"
          description="按周连续归档，把论文、研究日志和已发布内容整理成更紧凑的一份公开研究简报。"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>归档中共有 {digests.length} 期已发布周报。</p>
          <Link
            href="/archive"
            className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            浏览完整归档
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {digests.length > 0 ? (
          <div className="editorial-list">
            {digests.map((digest) => {
              const stats = getContentStats(digest.content ?? `${digest.title} ${digest.summary}`);

              return (
                <article key={digest.id} className="editorial-list-item group">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span className="rounded-full bg-[rgba(27,107,99,0.08)] px-3 py-1 text-[0.72rem] text-[var(--accent-strong)]">
                          每周周报
                        </span>
                        <span>
                          {formatDate(digest.periodStart, "yyyy-MM-dd")} -{" "}
                          {formatDate(digest.periodEnd, "yyyy-MM-dd")}
                        </span>
                        <span>{stats.estimatedMinutes} 分钟阅读</span>
                        <span>{stats.characterCount.toLocaleString("zh-CN")} 字</span>
                      </div>

                      <div className="space-y-3">
                        <h2 className="font-serif font-semibold tracking-tight text-[var(--ink)] text-[clamp(1.5rem,2.6vw,2.05rem)] leading-[1.08]">
                          <Link href={`/digest/${digest.slug}`} className="transition hover:text-[var(--accent-strong)]">
                            {digest.title}
                          </Link>
                        </h2>
                        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                          {digest.summary}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--ink-soft)]">
                        <span>论文 {digest.paperCount}</span>
                        <span>日志 {digest.journalCount}</span>
                        <span>文章 {digest.postCount}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {digest.highlights.slice(0, 4).map((highlight) => (
                          <span
                            key={highlight}
                            className="rounded-full border border-black/8 px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)]"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-end lg:justify-end">
                      <Link href={`/digest/${digest.slug}`} className="section-link-pill section-link-pill--compact">
                        <span>阅读周报</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            目前还没有每周周报。等你准备好发布阶段性总结后，可以在后台生成一份。
          </div>
        )}
      </div>
    </div>
  );
}
