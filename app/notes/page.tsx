import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getPublishedNotes } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "常青笔记",
  description:
    "用于沉淀概念总结、阅读摘录、方法笔记、清单和参考片段的长期型知识笔记。",
  path: "/notes",
  keywords: ["笔记", "常青笔记", "知识库", "参考资料"],
  section: "笔记",
  type: "website",
  ogEyebrow: "笔记",
});

export default async function NotesIndexPage() {
  const notes = await getPublishedNotes();
  const featuredCount = notes.filter((note) => note.featured).length;
  const noteTypes = new Set(notes.map((note) => note.noteType ?? "知识笔记"));
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客笔记",
    description:
      "公开展示的常青笔记、概念卡片、方法笔记和研究参考合集。",
    path: "/notes",
    itemCount: notes.length,
    keywords: ["笔记", "常青笔记", "知识库", "参考资料"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "笔记列表",
    path: "/notes",
    items: notes.map((note) => ({
      name: note.title,
      path: `/notes/${note.slug}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="笔记"
          title="常青笔记"
          description="这里放的是更适合长期积累的内容，比如概念总结、阅读摘录、方法笔记、检查清单和可复用片段，它们更像知识库，而不是时间流里的短更新。"
          href="/tags"
          linkLabel="浏览标签"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <p>
            共 {notes.length} 篇已发布笔记，其中 {featuredCount} 篇精选，覆盖 {noteTypes.size} 类笔记类型。
          </p>
          <Link
            href="/search?q=note"
            className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            搜索笔记
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {notes.length > 0 ? (
          <div className="editorial-list">
            {notes.map((note) => {
              const stats = getContentStats(note.content ?? `${note.title} ${note.summary}`);

              return (
                <article key={note.slug} className="editorial-list-item group">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        {note.featured ? (
                          <span className="rounded-full bg-[rgba(168,123,53,0.14)] px-3 py-1 text-[0.72rem] text-[var(--gold)]">
                            精选
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[rgba(168,123,53,0.1)] px-3 py-1 text-[0.72rem] text-[var(--gold)]">
                          {note.noteType ?? "知识笔记"}
                        </span>
                        <span>{formatDate(note.publishedAt, "yyyy-MM-dd")}</span>
                        <span>{stats.estimatedMinutes} 分钟阅读</span>
                        <span>{stats.characterCount.toLocaleString("zh-CN")} 字</span>
                      </div>

                      <div className="space-y-3">
                        <h2 className="font-serif font-semibold tracking-tight text-[var(--ink)] text-[clamp(1.5rem,2.6vw,2.05rem)] leading-[1.08]">
                          <Link href={`/notes/${note.slug}`} className="transition hover:text-[var(--accent-strong)]">
                            {note.title}
                          </Link>
                        </h2>
                        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                          {note.summary}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {note.tags.slice(0, 6).map((tag) => (
                          <TagLinkPill key={`${note.slug}-${tag}`} tag={tag} />
                        ))}
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
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            目前还没有已发布的笔记。你可以把内容放到 `content/notes` 下，再运行
            `npm run content:sync` 导入。
          </div>
        )}
      </div>
    </div>
  );
}
