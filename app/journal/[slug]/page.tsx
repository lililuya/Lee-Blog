import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, FileText } from "lucide-react";
import { ArticleOutline } from "@/components/site/article-outline";
import { JsonLd } from "@/components/site/json-ld";
import { Markdown } from "@/components/site/markdown";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildContentMetadata,
} from "@/lib/content-seo";
import { extractMarkdownHeadings } from "@/lib/markdown";
import { getJournalEntryBySlug, getRecentJournalEntries, getSiteProfile } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedJournalEntry = cache(getJournalEntryBySlug);
const getCachedSiteProfile = cache(getSiteProfile);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [entry, siteProfile] = await Promise.all([
    getCachedJournalEntry(slug),
    getCachedSiteProfile(),
  ]);

  if (!entry) {
    return {
      title: "Journal entry not found",
    };
  }

  return buildContentMetadata({
    title: entry.title,
    description: entry.summary,
    path: `/journal/${entry.slug}`,
    image: siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    imageAlt: entry.title,
    keywords: ["研究日志", "日志", entry.mood ?? "工作记录"],
    authorName: siteProfile.fullName,
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    section: "研究日志",
    type: "article",
    ogEyebrow: "日志",
  });
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [entry, siteProfile, recentEntries] = await Promise.all([
    getCachedJournalEntry(slug),
    getCachedSiteProfile(),
    getRecentJournalEntries(6),
  ]);

  if (!entry) {
    notFound();
  }

  const contentStats = getContentStats(entry.content);
  const headings = extractMarkdownHeadings(entry.content);
  const outlineHeadings = headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3);
  const relatedEntries = recentEntries.filter((item) => item.slug !== entry.slug).slice(0, 2);
  const articleJsonLd = buildArticleJsonLd({
    type: "Article",
    title: entry.title,
    description: entry.summary,
    path: `/journal/${entry.slug}`,
    image: siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    authorName: siteProfile.fullName,
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    keywords: ["研究日志", "日志", entry.mood ?? "工作记录"],
    section: "研究日志",
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首页", path: "/" },
    { name: "研究日志", path: "/journal" },
    { name: entry.title, path: `/journal/${entry.slug}` },
  ]);

  return (
    <div className="container-shell py-12 md:py-16">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <article className="editorial-shell space-y-10">
        <header className="editorial-hero space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/journal"
              className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]"
            >
              <ArrowLeft className="h-4 w-4" />
              返回日志列表
            </Link>
            <div className="text-sm font-semibold text-[var(--ink-soft)]">研究日志</div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
              <span className="badge-soft bg-[rgba(168,123,53,0.12)] text-[var(--gold)]">
                {entry.mood ?? "工作记录"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {contentStats.estimatedMinutes} 分钟阅读
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {contentStats.characterCount.toLocaleString("zh-CN")} 字
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {formatDate(entry.publishedAt, "yyyy-MM-dd HH:mm")}
              </span>
            </div>

            <h1 className="content-detail-title max-w-5xl font-serif font-semibold">
              {entry.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{entry.summary}</p>
          </div>
        </header>

        <section
          id="journal-content"
          className={outlineHeadings.length > 0 ? "grid gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]" : ""}
        >
          {outlineHeadings.length > 0 ? (
            <ArticleOutline headings={outlineHeadings} contentLabel="日志目录" />
          ) : null}

          <div className="min-w-0">
            <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-black/8 py-4 text-sm text-[var(--ink-soft)]">
              <span>这里保留日志全文，列表页只展示概览，方便持续写长。</span>
              <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                约 {contentStats.characterCount.toLocaleString("zh-CN")} 字
              </span>
              {outlineHeadings.length > 0 ? (
                <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                  {outlineHeadings.length} 个小节
                </span>
              ) : null}
            </div>

            <Markdown content={entry.content} headings={headings} />
          </div>
        </section>

        {relatedEntries.length > 0 ? (
          <section className="editorial-section space-y-6">
            <div className="space-y-2">
              <p className="section-kicker">继续阅读</p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">更多日志</h2>
              <p className="editorial-separator-copy">
                如果你想沿着最近的工作脉络继续看，可以从下面这些日志接着读。
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {relatedEntries.map((item) => (
                <Link
                  key={item.id}
                  href={`/journal/${item.slug}`}
                  className="editorial-panel group p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
                >
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                    {formatDate(item.publishedAt, "yyyy-MM-dd")}
                  </div>
                  <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.summary}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                    继续阅读
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
