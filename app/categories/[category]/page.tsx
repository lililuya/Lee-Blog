import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowRight, BookOpenText, FolderTree } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { SubscribeCallout } from "@/components/site/subscribe-callout";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getCategoryDetail } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedCategoryDetail = cache(getCategoryDetail);

function decodeRouteTaxonomyValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const detail = await getCachedCategoryDetail(decodeRouteTaxonomyValue(category));

  if (!detail) {
    return {
      title: "未找到分类",
    };
  }

  return buildContentMetadata({
    title: detail.category,
    description:
      "这个分类页会把同一主线下的博客文章集中展示，便于连续浏览相关内容。",
    path: `/categories/${encodeURIComponent(detail.category)}`,
    keywords: ["分类", detail.category, "博客分类"],
    section: "分类",
    type: "website",
    ogEyebrow: "分类",
  });
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const detail = await getCachedCategoryDetail(decodeRouteTaxonomyValue(category));

  if (!detail) {
    notFound();
  }

  const collectionJsonLd = buildCollectionPageJsonLd({
    name: detail.category,
    description:
      "这个分类页会把同一主线下的博客文章集中展示，便于连续浏览相关内容。",
    path: `/categories/${encodeURIComponent(detail.category)}`,
    itemCount: detail.total,
    keywords: ["分类", detail.category, "博客分类"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: `${detail.category} 分类文章`,
    path: `/categories/${encodeURIComponent(detail.category)}`,
    items: detail.posts.map((post) => ({
      name: post.title,
      path: `/blog/${post.slug}`,
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首页", path: "/" },
    { name: "分类", path: "/categories" },
    { name: detail.category, path: `/categories/${encodeURIComponent(detail.category)}` },
  ]);

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="分类"
          title={detail.category}
          description="这个分类会把同一主线下的长文文章放在一起，比在搜索结果里来回跳转更适合顺序阅读。"
          href="/categories"
          linkLabel="全部分类"
        />

        <div className="flex flex-wrap gap-5 text-sm text-[var(--ink-soft)]">
          <span>{detail.total} 篇已发布文章</span>
          <span>仅包含长文</span>
          <span>适合顺序阅读</span>
        </div>

        <SubscribeCallout
          title="订阅这个分类的后续文章"
          description="如果你只想跟进这个分类的新文章，可以预填这个分类筛选，而不必订阅整站更新。"
          categories={[detail.category]}
          source="category"
        />

        <section className="editorial-section space-y-6">
          <div className="flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">本分类文章</h2>
          </div>

          <div className="editorial-list">
            {detail.posts.map((post) => {
              const stats = getContentStats(post.content ?? `${post.title} ${post.excerpt}`);
              const readMinutes = Math.max(post.readTimeMinutes, stats.estimatedMinutes);

              return (
                <article key={post.slug} className="editorial-list-item">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span>{formatDate(post.publishedAt, "yyyy-MM-dd")}</span>
                        <span>阅读约 {readMinutes} 分钟</span>
                        <span>{stats.characterCount.toLocaleString()} 字</span>
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-serif text-[clamp(1.6rem,2.8vw,2.4rem)] font-semibold tracking-tight text-[var(--ink)]">
                          <Link href={`/blog/${post.slug}`} className="transition hover:text-[var(--accent-strong)]">
                            {post.title}
                          </Link>
                        </h3>
                        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                          {post.excerpt}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 5).map((tag) => (
                          <TagLinkPill key={`${post.slug}-${tag}`} tag={tag} />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-end lg:justify-end">
                      <Link href={`/blog/${post.slug}`} className="section-link-pill section-link-pill--compact">
                        <span>阅读文章</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="editorial-section space-y-4">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              为什么分类和标签要同时存在
            </h2>
          </div>
          <p className="editorial-separator-copy">
            分类负责更宏观的结构整理，标签则更细粒度，能把文章与常青笔记跨模块连接起来。
          </p>
        </section>
      </div>
    </div>
  );
}
