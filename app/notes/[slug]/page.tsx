import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, FileText, Layers3, Network, UserRound } from "lucide-react";
import { Markdown } from "@/components/site/markdown";
import { ContentSeriesNav } from "@/components/site/series-nav";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import { getNoteBacklinks, getNoteBySlug, getSeriesNavigation } from "@/lib/queries";
import { formatDate, getContentStats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);

  if (!note) {
    notFound();
  }

  const contentStats = getContentStats(note.content);
  const seriesNavigation = await getSeriesNavigation({
    seriesId: note.seriesId,
    contentId: note.id,
    type: "NOTE",
  });
  const backlinks = await getNoteBacklinks(note.slug);

  return (
    <div className="container-shell py-12 md:py-16">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/notes" className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]">
          <ArrowLeft className="h-4 w-4" />
          Back to notes
        </Link>
        <div className="hidden rounded-full border border-black/8 bg-white/72 px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] md:inline-flex">
          Evergreen reference
        </div>
      </div>

      <article className="space-y-10">
        <header className="glass-card rounded-[2.4rem] p-8 md:p-10">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
            <span className="badge-soft bg-[rgba(168,123,53,0.12)] text-[var(--gold)]">
              {note.noteType ?? "Knowledge Note"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {contentStats.estimatedMinutes} min read
            </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {contentStats.characterCount.toLocaleString()} chars
              </span>
              <span>{formatDate(note.publishedAt)}</span>
              {note.series ? (
                <Link
                  href={`/series/${note.series.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-1 font-semibold text-[var(--accent-strong)]"
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  {note.series.title}
                </Link>
              ) : null}
            </div>
          <h1 className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.05em]">
            {note.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--ink-soft)]">{note.summary}</p>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              {note.author.name}
            </span>
            <span>Designed for longer-term reuse and internal cross-linking.</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <TagLinkPill key={tag} tag={tag} />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#note-content" className="section-link-pill section-link-pill--compact">
              <FileText className="h-4 w-4" />
              Jump to note
            </a>
            <Link href="/notes" className="section-link-pill section-link-pill--compact section-link-pill--soft">
              <ArrowLeft className="h-4 w-4" />
              Browse all notes
            </Link>
          </div>
        </header>

        <section
          id="note-content"
          className="scroll-mt-28 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8"
        >
          <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-black/8 pb-5 text-sm text-[var(--ink-soft)]">
            <span>Evergreen notes are optimized for future reuse, linking, and gradual refinement.</span>
            <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
              Approx. {contentStats.characterCount.toLocaleString()} characters
            </span>
          </div>
          <Markdown content={note.content} />
        </section>

        {backlinks.length > 0 ? (
          <section className="space-y-5 rounded-[2rem] border border-black/8 bg-white/76 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Network className="h-4 w-4" />
                Knowledge network
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Referenced in other writing</h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
                This note is already cited by other public entries, which makes it easier to follow how one idea propagates across essays, digests, and working notes.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {backlinks.map((backlink) => (
                <Link
                  key={`${backlink.kindLabel}-${backlink.id}`}
                  href={backlink.href}
                  className="group rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.84)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                    <span className="badge-soft bg-[rgba(20,33,43,0.05)] text-[var(--ink)]">
                      {backlink.kindLabel}
                    </span>
                    <span>{formatDate(backlink.publishedAt, "yyyy-MM-dd")}</span>
                  </div>
                  <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">{backlink.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{backlink.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

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
