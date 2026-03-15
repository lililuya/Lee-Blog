import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarRange, Clock3, FileStack, FileText, Layers3 } from "lucide-react";
import { CitationPanel } from "@/components/site/citation-panel";
import { Markdown } from "@/components/site/markdown";
import { ContentSeriesNav } from "@/components/site/series-nav";
import { buildDigestBibtex, buildDigestCitation } from "@/lib/citations";
import { getSeriesNavigation, getWeeklyDigestBySlug } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WeeklyDigestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const digest = await getWeeklyDigestBySlug(slug);

  if (!digest) {
    notFound();
  }

  const contentStats = getContentStats(digest.content);
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

  return (
    <div className="container-shell py-12 md:py-16">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/digest" className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]">
          <ArrowLeft className="h-4 w-4" />
          Back to digests
        </Link>
        <div className="hidden rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] md:inline-flex">
          Weekly synthesis
        </div>
      </div>

      <article className="space-y-10">
        <header className="glass-card rounded-[2.4rem] p-8 md:p-10">
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
          <h1 className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.05em]">
            {digest.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{digest.summary}</p>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2">
              <FileStack className="h-4 w-4" />
              Papers {digest.paperCount} / Journal {digest.journalCount} / Posts {digest.postCount}
            </span>
            <span>{formatDate(digest.publishedAt, "yyyy-MM-dd HH:mm")}</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {digest.featuredTopics.map((topic) => (
              <span key={topic} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-[var(--ink-soft)]">
                #{topic}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#digest-content" className="section-link-pill section-link-pill--compact">
              <FileText className="h-4 w-4" />
              Jump to digest
            </a>
            <Link href="/digest" className="section-link-pill section-link-pill--compact section-link-pill--soft">
              <ArrowLeft className="h-4 w-4" />
              Browse all digests
            </Link>
          </div>
        </header>

        <section
          id="digest-content"
          className="scroll-mt-28 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8"
        >
          <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-black/8 pb-5 text-sm text-[var(--ink-soft)]">
            <span>研究输入、思考过程和打磨后输出的每周综合</span>
            <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
              Approx. {contentStats.characterCount.toLocaleString()} characters
            </span>
          </div>
          <Markdown content={digest.content} />
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
      </article>
    </div>
  );
}
