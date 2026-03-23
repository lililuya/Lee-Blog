import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, CalendarRange, Clock3, FileStack, FileText, Layers3 } from "lucide-react";
import { ArticleOutline } from "@/components/site/article-outline";
import { CitationPanel } from "@/components/site/citation-panel";
import { JsonLd } from "@/components/site/json-ld";
import { Markdown } from "@/components/site/markdown";
import { ContentSeriesNav } from "@/components/site/series-nav";
import { SubscribeCallout } from "@/components/site/subscribe-callout";
import { buildDigestBibtex, buildDigestCitation } from "@/lib/citations";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildContentMetadata,
} from "@/lib/content-seo";
import { extractMarkdownHeadings } from "@/lib/markdown";
import {
  getSeriesNavigation,
  getSiteProfile,
  getWeeklyDigestBySlug,
} from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

const getCachedDigest = cache(getWeeklyDigestBySlug);
const getCachedSiteProfile = cache(getSiteProfile);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [digest, siteProfile] = await Promise.all([getCachedDigest(slug), getCachedSiteProfile()]);

  if (!digest) {
    return {
      title: "Digest not found",
    };
  }

  return buildContentMetadata({
    title: digest.title,
    description: digest.summary,
    path: `/digest/${digest.slug}`,
    image: siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    imageAlt: digest.title,
    keywords: ["Weekly Digest", ...digest.featuredTopics],
    publishedAt: digest.publishedAt,
    updatedAt: digest.updatedAt,
    section: "Weekly Digest",
    type: "article",
  });
}

export default async function WeeklyDigestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [digest, siteProfile] = await Promise.all([getCachedDigest(slug), getCachedSiteProfile()]);

  if (!digest) {
    notFound();
  }

  const contentStats = getContentStats(digest.content);
  const headings = extractMarkdownHeadings(digest.content);
  const outlineHeadings = headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3);
  const citation = buildDigestCitation({
    title: digest.title,
    slug: digest.slug,
    publishedAt: digest.publishedAt,
    periodStart: digest.periodStart,
    periodEnd: digest.periodEnd,
  });
  const bibtex = buildDigestBibtex({
    title: digest.title,
    slug: digest.slug,
    publishedAt: digest.publishedAt,
    periodStart: digest.periodStart,
    periodEnd: digest.periodEnd,
  });
  const seriesNavigation = await getSeriesNavigation({
    seriesId: digest.seriesId,
    contentId: digest.id,
    type: "DIGEST",
  });
  const articleJsonLd = buildArticleJsonLd({
    type: "Article",
    title: digest.title,
    description: digest.summary,
    path: `/digest/${digest.slug}`,
    image: siteProfile.heroImageUrl ?? siteProfile.backgroundImageUrl,
    publishedAt: digest.publishedAt,
    updatedAt: digest.updatedAt,
    keywords: ["Weekly Digest", ...digest.featuredTopics],
    section: "Weekly Digest",
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Digest", path: "/digest" },
    { name: digest.title, path: `/digest/${digest.slug}` },
  ]);

  return (
    <div className="container-shell py-12 md:py-16">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <article className="editorial-shell space-y-10">
        <header className="editorial-hero space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/digest"
              className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to digests
            </Link>
            <div className="text-sm font-semibold text-[var(--ink-soft)]">Weekly synthesis</div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
              <span className="badge-soft">Weekly Digest</span>
              <span className="inline-flex items-center gap-2">
                <CalendarRange className="h-4 w-4" />
                {formatDate(digest.periodStart, "yyyy-MM-dd")} - {formatDate(digest.periodEnd, "yyyy-MM-dd")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {contentStats.estimatedMinutes} min read
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {contentStats.characterCount.toLocaleString()} chars
              </span>
              {digest.series ? (
                <Link
                  href={`/series/${digest.series.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-1 font-semibold text-[var(--accent-strong)]"
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  {digest.series.title}
                </Link>
              ) : null}
            </div>

            <h1 className="content-detail-title max-w-5xl font-serif font-semibold">
              {digest.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{digest.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2">
              <FileStack className="h-4 w-4" />
              Papers {digest.paperCount} / Journal {digest.journalCount} / Posts {digest.postCount}
            </span>
            <span>{formatDate(digest.publishedAt, "yyyy-MM-dd HH:mm")}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {digest.featuredTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-[var(--ink-soft)]"
              >
                #{topic}
              </span>
            ))}
          </div>
        </header>

        <section
          id="digest-content"
          className={outlineHeadings.length > 0 ? "grid gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]" : ""}
        >
          {outlineHeadings.length > 0 ? (
            <ArticleOutline headings={outlineHeadings} contentLabel="Digest outline" />
          ) : null}
          <div className="min-w-0">
            <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-black/8 py-4 text-sm text-[var(--ink-soft)]">
              <span>Weekly synthesis that turns research inputs and working notes into a compact public briefing.</span>
              <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                Approx. {contentStats.characterCount.toLocaleString()} characters
              </span>
              {outlineHeadings.length > 0 ? (
                <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                  {outlineHeadings.length} sections
                </span>
              ) : null}
            </div>
            <Markdown content={digest.content} headings={headings} />
          </div>
        </section>

        <CitationPanel
          citation={citation}
          bibtex={bibtex}
          title="Digest citation"
          description="Copy a shareable reference or a BibTeX entry when this digest becomes part of a paper trail, reading log, or literature review."
        />

        {seriesNavigation ? (
          <ContentSeriesNav
            series={seriesNavigation.series}
            currentIndex={seriesNavigation.currentIndex}
            previous={seriesNavigation.previous}
            next={seriesNavigation.next}
          />
        ) : null}

        <SubscribeCallout
          title="Subscribe to future updates from this research stream"
          description="If this digest reflects the topics you care about, prefill an email subscription with the featured themes below so future blog posts and weekly digests on the same thread are easier to catch."
          tags={digest.featuredTopics.slice(0, 6)}
          source="digest"
          prefillDigest
        />
      </article>
    </div>
  );
}
