import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getContentArchive } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "内容归档",
  description:
    "按月份浏览公开文章、笔记、每周周报和日志内容。",
  path: "/archive",
  keywords: ["归档", "时间线", "内容归档", "博客归档"],
  section: "归档",
  type: "website",
  ogEyebrow: "归档",
});

export default async function ArchivePage() {
  const archiveTimeline = await getContentArchive();
  const totalEntries = archiveTimeline.reduce((sum, group) => sum + group.total, 0);
  const archiveItems = archiveTimeline.flatMap((group) =>
    group.entries.map((entry) => ({
      name: entry.title,
      path: entry.href,
    })),
  );
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客归档",
    description:
      "按月份统一归档公开文章、笔记、每周周报和日志。",
    path: "/archive",
    itemCount: totalEntries,
    keywords: ["归档", "时间线", "内容归档", "博客归档"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "归档列表",
    path: "/archive",
    items: archiveItems.slice(0, 80),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="归档"
          title="内容归档"
          description="把文章、常青笔记、每周周报和日志更新统一放到一条连续时间线里，方便按月份而不是按模块浏览整个站点。"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>
            共收录 {archiveTimeline.length} 个月份分组、{totalEntries} 条公开内容。
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            搜索归档
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {archiveTimeline.length > 0 ? (
          <div className="space-y-10">
            {archiveTimeline.map((group) => (
              <section key={group.key} id={group.key} className="editorial-section scroll-mt-28 first:border-t-0 first:pt-0">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="section-kicker">月份</p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
                      {group.label}
                    </h2>
                  </div>
                  <div className="text-sm font-semibold text-[var(--ink-soft)]">
                    {group.total} 条内容
                  </div>
                </div>

                <div className="editorial-list">
                  {group.entries.map((entry) => (
                    <Link key={entry.id} href={entry.href} className="editorial-list-item block">
                      <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)_2.5rem] md:items-start">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                          <div>{entry.kindLabel}</div>
                          <div className="mt-2">{formatDate(entry.publishedAt, "yyyy-MM-dd")}</div>
                        </div>
                        <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)] transition group-hover:text-[var(--accent-strong)]">
                          {entry.title}
                        </h3>
                        <div className="hidden md:flex md:justify-end">
                          <ArrowUpRight className="h-4 w-4 text-[var(--accent-strong)]" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            目前还没有公开归档。等你发布文章、笔记或周报后，这个页面会自动补齐内容。
          </div>
        )}
      </div>
    </div>
  );
}
