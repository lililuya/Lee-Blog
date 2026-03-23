import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CategoryLinkPill } from "@/components/site/category-link-pill";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { formatContentLanguageShortLabel } from "@/lib/content-language";
import { getPublishedPosts } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "长文写作",
  description:
    "浏览完整文章、项目复盘、研究笔记和结构清晰的技术写作。",
  path: "/blog",
  keywords: ["博客", "长文", "技术写作", "研究笔记"],
  section: "文章",
  type: "website",
  ogEyebrow: "文章",
});

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客文章",
    description:
      "公开展示的长文、项目复盘、研究笔记和技术文章合集。",
    path: "/blog",
    itemCount: posts.length,
    keywords: ["博客", "长文", "技术写作", "研究笔记"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "文章列表",
    path: "/blog",
    items: posts.map((post) => ({
      name: post.title,
      path: `/blog/${post.slug}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="文章"
          title="博客长文"
          description="记载一些实验心得、学习经验、工程问题等"
          href="/categories"
          linkLabel="浏览分类"
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>
              归档中共 {posts.length} 篇已发布文章。
            </p>
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
            >
              打开完整归档
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="editorial-list">
            {posts.map((post) => {
              const stats = getContentStats(post.content ?? `${post.title} ${post.excerpt}`);
              const readMinutes = Math.max(post.readTimeMinutes, stats.estimatedMinutes);

              return (
                <article key={post.slug} className="editorial-list-item group">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        {post.pinned ? (
                          <span className="rounded-full bg-[rgba(168,123,53,0.14)] px-3 py-1 text-[0.72rem] text-[var(--gold)]">
                            置顶
                          </span>
                        ) : null}
                        <CategoryLinkPill category={post.category} />
                        <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                          {formatContentLanguageShortLabel(post.language)}
                        </span>
                        <span>{formatDate(post.publishedAt, "yyyy-MM-dd")}</span>
                        <span>{readMinutes} 分钟阅读</span>
                        <span>{stats.characterCount.toLocaleString("zh-CN")} 字</span>
                      </div>

                      <div className="space-y-3">
                        <h2 className="font-serif text-[clamp(1.3rem,2vw,1.72rem)] font-semibold leading-[1.08] tracking-tight text-[var(--ink)]">
                          <Link href={`/blog/${post.slug}`} className="transition hover:text-[var(--accent-strong)]">
                            {post.title}
                          </Link>
                        </h2>
                        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 6).map((tag) => (
                          <TagLinkPill key={tag} tag={tag} />
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
        </div>
      </div>
    </div>
  );
}
