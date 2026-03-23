import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowRight, Hash, Layers3, NotebookPen } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { SubscribeCallout } from "@/components/site/subscribe-callout";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getTagDetail } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedTagDetail = cache(getTagDetail);

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
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const detail = await getCachedTagDetail(decodeRouteTaxonomyValue(tag));

  if (!detail) {
    return {
      title: "未找到标签",
    };
  }

  return buildContentMetadata({
    title: `#${detail.tag}`,
    description:
      "这个标签页会把共享同一主题标签的文章和常青笔记汇总到一起。",
    path: `/tags/${encodeURIComponent(detail.tag)}`,
    keywords: ["标签", detail.tag, "主题索引"],
    section: "标签",
    type: "website",
    ogEyebrow: "标签",
  });
}

export default async function TagDetailPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const detail = await getCachedTagDetail(decodeRouteTaxonomyValue(tag));

  if (!detail) {
    notFound();
  }

  const collectionJsonLd = buildCollectionPageJsonLd({
    name: `#${detail.tag}`,
    description:
      "这个标签页会把共享同一主题标签的文章和常青笔记汇总到一起。",
    path: `/tags/${encodeURIComponent(detail.tag)}`,
    itemCount: detail.total,
    keywords: ["标签", detail.tag, "主题索引"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: `带有 ${detail.tag} 标签的内容`,
    path: `/tags/${encodeURIComponent(detail.tag)}`,
    items: [
      ...detail.posts.map((post) => ({ name: post.title, path: `/blog/${post.slug}` })),
      ...detail.notes.map((note) => ({ name: note.title, path: `/notes/${note.slug}` })),
    ],
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首页", path: "/" },
    { name: "标签", path: "/tags" },
    { name: `#${detail.tag}`, path: `/tags/${encodeURIComponent(detail.tag)}` },
  ]);

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="标签"
          title={`#${detail.tag}`}
          description="这个标签页会把共享同一主题标签的文章和常青笔记集中起来，方便沿主题继续浏览。"
          href="/tags"
          linkLabel="全部标签"
        />

        <div className="flex flex-wrap gap-5 text-sm text-[var(--ink-soft)]">
          <span>{detail.total} 条内容</span>
          <span>{detail.posts.length} 篇文章</span>
          <span>{detail.notes.length} 条笔记</span>
        </div>

        <SubscribeCallout
          title="订阅这个标签下的新文章"
          description="如果这个主题比整个分类更重要，可以预填标签订阅，只接收和这条研究线相关的新文章。"
          tags={[detail.tag]}
          source="tag"
        />

        {detail.posts.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-serif text-3xl font-semibold tracking-tight">博客文章</h2>
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
                          <span>{post.category}</span>
                          <span>{formatDate(post.publishedAt, "yyyy-MM-dd")}</span>
                          <span>阅读约 {readMinutes} 分钟</span>
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
        ) : null}

        {detail.notes.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-[var(--gold)]" />
              <h2 className="font-serif text-3xl font-semibold tracking-tight">笔记</h2>
            </div>

            <div className="editorial-list">
              {detail.notes.map((note) => {
                const stats = getContentStats(note.content ?? `${note.title} ${note.summary}`);

                return (
                  <article key={note.slug} className="editorial-list-item">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                          <span>{note.noteType ?? "知识笔记"}</span>
                          <span>{formatDate(note.publishedAt, "yyyy-MM-dd")}</span>
                          <span>阅读约 {stats.estimatedMinutes} 分钟</span>
                        </div>
                        <div className="space-y-3">
                          <h3 className="font-serif text-[clamp(1.6rem,2.8vw,2.4rem)] font-semibold tracking-tight text-[var(--ink)]">
                            <Link href={`/notes/${note.slug}`} className="transition hover:text-[var(--accent-strong)]">
                              {note.title}
                            </Link>
                          </h3>
                          <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                            {note.summary}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-end lg:justify-end">
                        <Link href={`/notes/${note.slug}`} className="section-link-pill section-link-pill--compact">
                          <span>阅读笔记</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="editorial-section space-y-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-2xl font-semibold tracking-tight">为什么需要这个页面</h2>
          </div>
          <p className="editorial-separator-copy">
            如果你已经知道要找什么，搜索会更快；如果你想沿着一个主题继续发散阅读，标签页会更合适。
          </p>
        </section>
      </div>
    </div>
  );
}
