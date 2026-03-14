import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, FileText, UserRound } from "lucide-react";
import { Markdown } from "@/components/site/markdown";
import { ReadingProgress } from "@/components/site/reading-progress";
import { getNoteBySlug } from "@/lib/queries";
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

  return (
    <div className="container-shell py-12 md:py-16">
      <ReadingProgress targetId="note-content" label={`Reading progress for ${note.title}`} />

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
            <span className="badge-soft bg-[rgba(168,123,53,0.12)] text-[var(--gold)]">{note.noteType ?? "Knowledge Note"}</span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {contentStats.estimatedMinutes} min read
            </span>
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {contentStats.characterCount.toLocaleString()} chars
            </span>
            <span>{formatDate(note.publishedAt)}</span>
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
              <span key={tag} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-[var(--ink-soft)]">
                #{tag}
              </span>
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
      </article>
    </div>
  );
}
