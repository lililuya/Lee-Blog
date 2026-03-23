import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  NotebookPen,
  ScrollText,
  Search,
  type LucideIcon,
} from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { SectionHeading } from "@/components/site/section-heading";
import { getPaperAnchorId } from "@/lib/papers";
import { searchSite } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const suggestedQueries = [
  "LLM agent",
  "RAG",
  "工作流",
  "周报",
  "检查清单",
  "提示词框架",
];

const searchPageDescription =
  "在一个入口里统一搜索博客长文、常青笔记、日志条目、每周周报和每日论文卡片。";
const searchPageKeywords = [
  "站内搜索",
  "博客搜索",
  "研究笔记",
  "每周周报",
  "论文归档",
];

type SearchPageSearchParams = {
  q?: string;
};

type SearchResultSet = Awaited<ReturnType<typeof searchSite>>;

type SearchRenderItem = {
  id: string;
  href: string;
  title: string;
  summary: string;
  meta: string;
  cta: string;
};

type SearchRenderSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  emptyLabel: string;
  items: SearchRenderItem[];
};

function buildSearchResultItems(results: SearchResultSet) {
  return [
    ...results.posts.map((post) => ({
      name: post.title,
      path: `/blog/${post.slug}`,
    })),
    ...results.notes.map((note) => ({
      name: note.title,
      path: `/notes/${note.slug}`,
    })),
    ...results.journalEntries.map((entry) => ({
      name: entry.title,
      path: `/journal/${entry.slug}`,
    })),
    ...results.weeklyDigests.map((digest) => ({
      name: digest.title,
      path: `/digest/${digest.slug}`,
    })),
    ...results.paperEntries.map((entry) => ({
      name: entry.title,
      path: `/papers#${getPaperAnchorId({
        arxivId: entry.arxivId,
        id: entry.id,
        topicId: entry.topicId,
        digestDate: entry.digestDate,
      })}`,
    })),
  ];
}

function buildSearchRenderSections(results: SearchResultSet): SearchRenderSection[] {
  return [
    {
      id: "posts",
      title: "文章",
      icon: FileSearch,
      emptyLabel: "暂时没有匹配到相关文章。",
      items: results.posts.map((post) => ({
        id: post.id,
        href: `/blog/${post.slug}`,
        title: post.title,
        summary: post.excerpt,
        meta: `${post.category} / ${formatDate(post.publishedAt, "yyyy-MM-dd")}`,
        cta: "阅读文章",
      })),
    },
    {
      id: "notes",
      title: "常青笔记",
      icon: NotebookPen,
      emptyLabel: "暂时没有匹配到相关笔记。",
      items: results.notes.map((note) => ({
        id: note.id,
        href: `/notes/${note.slug}`,
        title: note.title,
        summary: note.summary,
        meta: `${note.noteType ?? "知识笔记"} / ${formatDate(note.publishedAt, "yyyy-MM-dd")}`,
        cta: "打开笔记",
      })),
    },
    {
      id: "journal",
      title: "日志",
      icon: ScrollText,
      emptyLabel: "暂时没有匹配到相关日志。",
      items: results.journalEntries.map((entry) => ({
        id: entry.id,
        href: `/journal/${entry.slug}`,
        title: entry.title,
        summary: entry.summary,
        meta: `日志 / ${formatDate(entry.publishedAt, "yyyy-MM-dd HH:mm")}`,
        cta: "打开日志",
      })),
    },
    {
      id: "digests",
      title: "每周周报",
      icon: ScrollText,
      emptyLabel: "暂时没有匹配到相关周报。",
      items: results.weeklyDigests.map((digest) => ({
        id: digest.id,
        href: `/digest/${digest.slug}`,
        title: digest.title,
        summary: digest.summary,
        meta: `周报 / ${formatDate(digest.periodStart, "yyyy-MM-dd")} - ${formatDate(
          digest.periodEnd,
          "yyyy-MM-dd",
        )}`,
        cta: "阅读周报",
      })),
    },
    {
      id: "papers",
      title: "每日论文",
      icon: FileSearch,
      emptyLabel: "暂时没有匹配到相关论文条目。",
      items: results.paperEntries.map((entry) => ({
        id: entry.id,
        href: `/papers#${getPaperAnchorId({
          arxivId: entry.arxivId,
          id: entry.id,
          topicId: entry.topicId,
          digestDate: entry.digestDate,
        })}`,
        title: entry.title,
        summary: entry.summary,
        meta: `${entry.topic.name} / ${formatDate(entry.digestDate, "yyyy-MM-dd")}${entry.primaryCategory ? ` / ${entry.primaryCategory}` : ""}`,
        cta: "打开论文条目",
      })),
    },
  ];
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchPageSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const title = query ? `“${query}”的搜索结果` : "站内搜索";
  const description = query
    ? `浏览和“${query}”相关的文章、笔记、日志、周报与论文条目。`
    : searchPageDescription;

  return {
    ...buildContentMetadata({
      title,
      description,
      path: "/search",
      keywords: [...searchPageKeywords, ...(query ? [query] : [])],
      section: "搜索",
      type: "website",
      ogEyebrow: "搜索",
    }),
    robots: query ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageSearchParams>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const results = query ? await searchSite(query) : null;
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: query ? `Lee 博客关于 ${query} 的搜索结果` : "Lee 博客搜索",
    description: query
      ? `${query} 在文章、笔记、日志、周报与论文条目中的搜索结果。`
      : searchPageDescription,
    path: "/search",
    itemCount: query ? (results?.total ?? 0) : suggestedQueries.length,
    keywords: [...searchPageKeywords, ...(query ? [query] : [])],
    type: "WebPage",
  });
  const resultItems = results ? buildSearchResultItems(results) : [];
  const itemListJsonLd =
    resultItems.length > 0
      ? buildItemListJsonLd({
          name: query ? `${query} 的搜索结果列表` : "搜索结果列表",
          path: "/search",
          items: resultItems,
        })
      : null;
  const sections = results ? buildSearchRenderSections(results) : [];

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      {itemListJsonLd ? <JsonLd data={itemListJsonLd} /> : null}

      <div className="editorial-shell space-y-10">
        <section className="space-y-6">
          <SectionHeading
            kicker="搜索"
            title="站内搜索"
            description="在一套连续索引里同时搜索文章、常青笔记、日志更新、每周周报和每日论文条目。"
          />

          <form action="/search" className="editorial-form-shell flex flex-col gap-3 md:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={query}
              className="field"
              placeholder="例如：LLM agent / RAG / 工作流 / 提示词框架"
            />
            <button type="submit" className="btn-primary md:min-w-36">
              <Search className="h-4 w-4" />
              搜索
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {suggestedQueries.map((item) => (
              <Link
                key={item}
                href={`/search?q=${encodeURIComponent(item)}`}
                className="rounded-full border border-black/8 px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                {item}
              </Link>
            ))}
          </div>
        </section>

        {results ? (
          <>
            <section className="editorial-section pt-0 border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
                <p>
                  关键词 <span className="font-semibold text-[var(--ink)]">{query}</span> 共找到 {results.total} 条结果。
                </p>
                <p>
                  文章 {results.posts.length} / 笔记 {results.notes.length} / 日志 {results.journalEntries.length} / 周报 {results.weeklyDigests.length} / 论文 {results.paperEntries.length}
                </p>
              </div>
            </section>

            <div className="space-y-10">
              {sections.map((section) => {
                const Icon = section.icon;

                return (
                  <section key={section.id} className="editorial-section">
                    <div className="mb-5 flex items-center gap-3">
                      <Icon className="h-4 w-4 text-[var(--accent)]" />
                      <h2 className="font-serif text-3xl font-semibold tracking-tight">
                        {section.title}
                      </h2>
                    </div>

                    {section.items.length > 0 ? (
                      <div className="editorial-list">
                        {section.items.map((item) => (
                          <article key={item.id} className="editorial-list-item group">
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-end">
                              <div className="space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                                  {item.meta}
                                </div>
                                <h3 className="font-serif text-[clamp(1.5rem,2.8vw,2.3rem)] font-semibold tracking-tight text-[var(--ink)]">
                                  <Link
                                    href={item.href}
                                    className="transition hover:text-[var(--accent-strong)]"
                                  >
                                    {item.title}
                                  </Link>
                                </h3>
                                <p className="max-w-3xl text-sm leading-8 text-[var(--ink-soft)]">
                                  {item.summary}
                                </p>
                              </div>

                              <div className="flex items-end lg:justify-end">
                                <Link
                                  href={item.href}
                                  className="section-link-pill section-link-pill--compact"
                                >
                                  {item.cta}
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="editorial-panel p-5 text-sm leading-7 text-[var(--ink-soft)]">
                        {section.emptyLabel}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            先在上方输入关键词。系统会统一搜索文章、笔记、日志、论文和每周周报。
          </div>
        )}
      </div>
    </div>
  );
}
