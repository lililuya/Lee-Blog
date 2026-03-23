import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarRange, Layers3 } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getPublicContentSeriesBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedSeries = cache(getPublicContentSeriesBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await getCachedSeries(slug);

  if (!series) {
    return {
      title: "未找到专题",
    };
  }

  return buildContentMetadata({
    title: series.title,
    description: series.summary,
    path: `/series/${series.slug}`,
    image: series.coverImageUrl,
    imageAlt: series.title,
    keywords: ["专题", "顺序阅读", series.title],
    section: "专题",
    type: "website",
    ogEyebrow: "专题",
  });
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getCachedSeries(slug);

  if (!series) {
    notFound();
  }

  const collectionJsonLd = buildCollectionPageJsonLd({
    name: series.title,
    description: series.description || series.summary,
    path: `/series/${series.slug}`,
    image: series.coverImageUrl,
    itemCount: series.totalCount,
    keywords: ["专题", "顺序阅读", series.title],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: `${series.title} 阅读顺序`,
    path: `/series/${series.slug}`,
    items: series.entries.map((entry) => ({
      name: entry.title,
      path: entry.href,
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首页", path: "/" },
    { name: "专题", path: "/series" },
    { name: series.title, path: `/series/${series.slug}` },
  ]);

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="专题"
          title={series.title}
          description={series.summary}
          href="/series"
          linkLabel="全部专题"
        />

        <div className="flex flex-wrap gap-5 text-sm text-[var(--ink-soft)]">
          <span>{series.totalCount} 条内容</span>
          <span>{series.postCount} 篇文章</span>
          <span>{series.noteCount} 条笔记</span>
          <span>{series.digestCount} 份周报</span>
        </div>

        <section className="editorial-section space-y-4">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <Layers3 className="h-4 w-4" />
            专题概览
          </div>
          <p className="editorial-separator-copy">{series.description}</p>
        </section>

        <section className="editorial-section space-y-6">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">阅读顺序</h2>
          </div>

          <div className="editorial-list">
            {series.entries.map((entry, index) => (
              <Link key={`${entry.type}-${entry.id}`} href={entry.href} className="editorial-list-item block">
                <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)_8rem] md:items-start">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <div>第 {index + 1} 部分</div>
                    <div className="mt-2">{entry.kindLabel}</div>
                    <div className="mt-2">{formatDate(entry.publishedAt, "yyyy-MM-dd")}</div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                      {entry.title}
                    </h3>
                    <p className="max-w-4xl text-sm leading-7 text-[var(--ink-soft)]">
                      {entry.summary}
                    </p>
                  </div>
                  <div className="text-left text-sm font-semibold text-[var(--ink-soft)] md:text-right">
                    {entry.seriesOrder ? `顺序 ${entry.seriesOrder}` : "打开"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
