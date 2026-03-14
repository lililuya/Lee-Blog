import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarRange, Clock3, FileStack, FileText } from "lucide-react";
import { Markdown } from "@/components/site/markdown";
import { ReadingProgress } from "@/components/site/reading-progress";
import { getWeeklyDigestBySlug } from "@/lib/queries";
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

  return (
    <div className="container-shell py-12 md:py-16">
      <ReadingProgress targetId="digest-content" label={`Reading progress for ${digest.title}`} />

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
      </article>
    </div>
  );
}