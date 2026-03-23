import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FolderTree } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getCategoryArchive, getTagArchive } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "按分类浏览",
  description:
    "通过分类浏览博客长文，用更清晰的主题结构整理公开内容。",
  path: "/categories",
  keywords: ["分类", "博客分类", "内容结构", "内容发现"],
  section: "分类",
  type: "website",
  ogEyebrow: "分类",
});

export default async function CategoriesPage() {
  const [categories, tags] = await Promise.all([getCategoryArchive(), getTagArchive(12)]);
  const topCategory = categories[0] ?? null;
  const totalPosts = categories.reduce((sum, item) => sum + item.count, 0);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客分类索引",
    description:
      "面向公开长文内容的分类索引，适合按主题进行整体浏览。",
    path: "/categories",
    itemCount: categories.length,
    keywords: ["分类", "博客分类", "内容结构", "内容发现"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "分类列表",
    path: "/categories",
    items: categories.map((item) => ({
      name: item.category,
      path: `/categories/${encodeURIComponent(item.category)}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="分类"
          title="按分类浏览"
          description="分类负责整理博客里的长文内容，让文章和项目总结在进入搜索前就能先按主题快速浏览。"
          href="/tags"
          linkLabel="查看标签"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>
            共 {categories.length} 个分类，已发布 {totalPosts} 篇文章，当前最活跃分类：
            {topCategory?.category ?? "暂无"}。
          </p>
          <Link
            href="/archive"
            className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            打开归档
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="editorial-list">
            {categories.map((item) => (
              <Link
                key={item.category}
                href={`/categories/${encodeURIComponent(item.category)}`}
                className="editorial-list-item block"
              >
                <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)_8rem] md:items-start">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <div className="inline-flex items-center gap-2 text-[var(--accent-strong)]">
                      <FolderTree className="h-4 w-4" />
                      分类
                    </div>
                    <div className="mt-2">
                      最近更新：
                      {item.latestPublishedAt
                        ? formatDate(item.latestPublishedAt, "yyyy-MM-dd")
                        : "暂无"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
                      {item.category}
                    </h2>
                    <p className="text-base leading-8 text-[var(--ink-soft)]">
                      站内长文内容的主题分组，适合从更大的脉络开始阅读。
                    </p>
                  </div>
                  <div className="text-left text-sm font-semibold text-[var(--ink-soft)] md:text-right">
                    {item.count} 篇文章
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            暂时还没有公开分类。发布带分类的博客文章后，这里会逐步完善。
          </div>
        )}

        <section className="editorial-section space-y-5">
          <div className="space-y-2">
            <p className="section-kicker">交叉浏览</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">热门标签</h2>
            <p className="editorial-separator-copy">
              标签比分类更细，可以把文章与笔记在不同内容模块之间继续串联起来。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {tags.map((item) => (
              <Link
                key={item.tag}
                href={`/tags/${encodeURIComponent(item.tag)}`}
                className="rounded-full border border-black/8 px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                #{item.tag} · {item.count}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
