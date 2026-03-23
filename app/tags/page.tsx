import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Hash } from "lucide-react";
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
  title: "按标签浏览",
  description:
    "通过全站标签索引，在文章与常青笔记之间持续跟进同一个主题。",
  path: "/tags",
  keywords: ["标签", "主题索引", "内容分类", "站内发现"],
  section: "标签",
  type: "website",
  ogEyebrow: "标签",
});

export default async function TagsPage() {
  const [tags, categories] = await Promise.all([getTagArchive(), getCategoryArchive(8)]);
  const topTag = tags[0] ?? null;
  const totalAssignments = tags.reduce((sum, item) => sum + item.count, 0);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客标签索引",
    description:
      "通过共享标签连接博客文章与常青笔记的公开主题索引。",
    path: "/tags",
    itemCount: tags.length,
    keywords: ["标签", "主题索引", "内容分类", "站内发现"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "标签列表",
    path: "/tags",
    items: tags.map((item) => ({
      name: `#${item.tag}`,
      path: `/tags/${encodeURIComponent(item.tag)}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="标签"
          title="按标签浏览"
          description="标签能把相关文章和常青笔记跨页面连接起来，让你持续沿着一个主题词汇往下读。"
          href="/categories"
          linkLabel="查看分类"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>
            共 {tags.length} 个标签，累计 {totalAssignments} 次标注，当前最热门主题：
            {topTag ? `#${topTag.tag}` : "暂无"}。
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            按主题搜索
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {tags.length > 0 ? (
          <div className="editorial-list">
            {tags.map((item) => (
              <Link
                key={item.tag}
                href={`/tags/${encodeURIComponent(item.tag)}`}
                className="editorial-list-item block"
              >
                <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)_8rem] md:items-start">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <div className="inline-flex items-center gap-2 text-[var(--accent-strong)]">
                      <Hash className="h-4 w-4" />
                      标签
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
                      #{item.tag}
                    </h2>
                    <p className="text-base leading-8 text-[var(--ink-soft)]">
                      当前有 {item.postCount} 篇文章和 {item.noteCount} 条笔记使用这个主题标签。
                    </p>
                  </div>
                  <div className="text-left text-sm font-semibold text-[var(--ink-soft)] md:text-right">
                    {item.count} 条内容
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            暂时还没有公开标签。发布带标签的文章或笔记后，这个主题索引会逐步形成。
          </div>
        )}

        <section className="editorial-section space-y-5">
          <div className="space-y-2">
            <p className="section-kicker">交叉浏览</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">相关分类</h2>
            <p className="editorial-separator-copy">
              分类负责宏观结构，标签负责细粒度关联，让读者能跨内容区块持续追踪同一主题。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {categories.map((item) => (
              <Link
                key={item.category}
                href={`/categories/${encodeURIComponent(item.category)}`}
                className="rounded-full border border-black/8 px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                {item.category} · {item.count}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
