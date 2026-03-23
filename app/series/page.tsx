import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Layers3, Star } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getPublicContentSeries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "专题阅读",
  description:
    "把相关文章、笔记和每周周报按阅读顺序串起来，而不是让它们散落成独立页面。",
  path: "/series",
  keywords: ["专题", "阅读路径", "内容专题", "顺序阅读"],
  section: "专题",
  type: "website",
  ogEyebrow: "专题",
});

export default async function SeriesIndexPage() {
  const seriesList = await getPublicContentSeries();
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客专题",
    description:
      "把文章、笔记和每周周报串联起来的公开专题集合。",
    path: "/series",
    itemCount: seriesList.length,
    keywords: ["专题", "阅读路径", "内容专题", "顺序阅读"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "专题列表",
    path: "/series",
    items: seriesList.map((series) => ({
      name: series.title,
      path: `/series/${series.slug}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="专题"
          title="专题阅读"
          description="按照明确阅读顺序，把文章、笔记和周报串成一条连续的阅读路径，而不是逐篇零散发现。"
          href="/archive"
          linkLabel="查看归档"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>当前共有 {seriesList.length} 个公开专题可供阅读。</p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            打开文章归档
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {seriesList.length > 0 ? (
          <div className="editorial-list">
            {seriesList.map((series) => (
              <Link
                key={series.id}
                href={`/series/${series.slug}`}
                className="editorial-list-item block"
              >
                <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)_10rem] md:items-start">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <div className="inline-flex items-center gap-2 text-[var(--accent-strong)]">
                      <Layers3 className="h-4 w-4" />
                      专题
                    </div>
                    <div className="mt-2">
                      最近更新：
                      {series.latestPublishedAt
                        ? formatDate(series.latestPublishedAt, "yyyy-MM-dd")
                        : "暂无"}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
                        {series.title}
                      </h2>
                      {series.featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(168,123,53,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold)]">
                          <Star className="h-3.5 w-3.5" />
                          推荐
                        </span>
                      ) : null}
                    </div>
                    <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                      {series.summary}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-[var(--ink-soft)]">
                      <span>{series.totalCount} 条内容</span>
                      <span>{series.postCount} 篇文章</span>
                      <span>{series.noteCount} 条笔记</span>
                      <span>{series.digestCount} 份周报</span>
                    </div>
                  </div>
                  <div className="text-left text-sm font-semibold text-[var(--ink-soft)] md:text-right">
                    进入专题
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            暂时还没有公开专题。等文章、笔记或周报被串成一条阅读路径后，这里就会显示出来。
          </div>
        )}
      </div>
    </div>
  );
}
